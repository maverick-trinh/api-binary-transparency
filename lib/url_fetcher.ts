import {
  DomainDetails,
  isResource,
  optionalRangeToHeaders as optionalRangeToRequestHeaders,
  Routes,
} from "./types/index";
import { subdomainToObjectId, HEXtoBase36 } from "./objectId_operations";
import { SuiNSResolver } from "./suins";
import { ResourceFetcher } from "./resource";
import { aggregatorEndpoint } from "./aggrerator";
import { toBase64 } from "@mysten/bcs";
import { sha256 } from "./crypto";
import { WalrusSitesRouter } from "./routing";
import { HttpStatusCodes } from "./http/http_status_codes";
import logger from "./logger";

/**
 * Includes all the logic for fetching the URL contents of a walrus site.
 */
export class UrlFetcher {
  constructor(
    private resourceFetcher: ResourceFetcher,
    private suinsResolver: SuiNSResolver,
    private wsRouter: WalrusSitesRouter,
    private aggregatorUrl: string,
    private b36DomainResolutionSupport: boolean
  ) {}

  /**
   * Resolves the subdomain to an object ID, and gets the corresponding resources.
   *
   * The `resolvedObjectId` variable is the object ID of the site that was previously resolved. If
   * `null`, the object ID is resolved again.
   */
  public async resolveDomainAndFetchUrl(
    parsedUrl: DomainDetails,
    resolvedObjectId: string | null
  ): Promise<string> {
    logger.info(
      "Resolving the subdomain to an object ID and retrieving its resources",
      { subdomain: parsedUrl.subdomain, path: parsedUrl.path }
    );
    if (!resolvedObjectId) {
      const resolveObjectResult = await this.resolveObjectId(parsedUrl);
      const isObjectId = typeof resolveObjectResult == "string";
      if (isObjectId) {
        return resolveObjectResult;
      }

    }

    return "";
  }

  async resolveObjectId(parsedUrl: DomainDetails): Promise<string | Response> {
    logger.info("Resolving the subdomain to an object ID", {
      subdomain: parsedUrl.subdomain,
    });

    // Resolve to an objectId using a hard-coded subdomain.
    const hardCodedObjectId = this.suinsResolver.hardcodedSubdomains(
      parsedUrl.subdomain
    );
    if (hardCodedObjectId) return hardCodedObjectId;

    // If b36 subdomains are supported, resolve them by converting them to a hex object id.
    const isSuiNSDomain = parsedUrl.subdomain.includes(".");
    const isb36Domain = !isSuiNSDomain;
    if (this.b36DomainResolutionSupport && isb36Domain) {
      // Try to convert the subdomain to an object ID NOTE: This effectively _disables_ any SuiNs
      // name that is the base36 encoding of an object ID (i.e., a 32-byte string). This is
      // desirable, prevents people from getting suins names that are the base36 encoding the
      // object ID of a target site (with the goal of hijacking non-suins queries).
      const resolvedB36toHex = subdomainToObjectId(parsedUrl.subdomain);
      if (resolvedB36toHex) return resolvedB36toHex;
    }

    // Resolve the SuiNS domain to an object id.
    try {
      const objectId = await this.suinsResolver.resolveSuiNsAddress(
        parsedUrl.subdomain
      );
      if (objectId) return objectId;
      logger.warn("Unable to resolve the SuiNS domain. Is the domain valid?", {
        subdomain: parsedUrl.subdomain,
      });
      return "Error noObjectIdFound";
    } catch {
      logger.error(
        "Unable to reach the full node during suins domain resolution",
        { subdomain: parsedUrl.subdomain }
      );
      return "Errro Node Fail";
    }
  }

  /**
   * Fetches the URL of a walrus site.
   * @param objectId - The object ID of the site object.
   * @param path - The path of the site resource to fetch. e.g. /index.html
   */
  public async fetchUrl(objectId: string, path: string): Promise<Response> {
    const result = await this.resourceFetcher.fetchResource(
      objectId,
      path,
      new Set<string>()
    );
    if (!isResource(result) || !result.blob_id) {
      return new Response("Not found", {
        status: 404,
        headers: {
          "Content-Type": "text/html",
        },
      });
    }

    logger.info("Successfully fetched resource!", {
      fetchedResourceResult: JSON.stringify(result),
    });

    // We have a resource, get the range header.
    let range_header = optionalRangeToRequestHeaders(result.range);
    logger.info("Fetching blob from aggregator", {
      aggregatorUrl: this.aggregatorUrl,
      blob_id: result.blob_id,
    });
    const contents = await this.fetchWithRetry(
      aggregatorEndpoint(result.blob_id, this.aggregatorUrl),
      { headers: range_header }
    );
    if (!contents.ok) {
      logger.error(
        "Failed to fetch resource! Response from aggregator endpoint not ok.",
        { path: result.path, status: contents.status }
      );
      // return siteNotFound();
    }

    const body = await contents.arrayBuffer();
    // Verify the integrity of the aggregator response by hashing
    // the response contents.
    const h10b = toBase64(await sha256(body));
    // if (result.blob_hash != h10b) {
    //     logger.error(
    //         "Checksum mismatch! The hash of the fetched resource does not " +
    //         "match the hash of the aggregator response.",{
    //         path: result.path,
    //         blobHash: result.blob_hash,
    //         aggrHash: h10b
    //     });
    //     return generateHashErrorResponse();
    // }

    return new Response(body, {
      headers: {
        ...Object.fromEntries(result.headers),
        "x-resource-sui-object-version": result.version,
        "x-resource-sui-object-id": result.objectId,
        "x-unix-time-cached": Date.now().toString(),
      },
    });
  }

  /**
   * Attempts to fetch a resource from the given input URL or Request object, with retry logic.
   *
   * Retries the fetch operation up to a specified number of attempts in case of failure,
   * with a delay between each retry. Logs the status and error messages during retries.
   *
   * @param input - The URL string, URL object, or Request object representing the resource to fetch.
   * @param init - Optional fetch options such as headers, method, and body.
   * @param retries - The maximum number of retry attempts (default is 3).
   * @param delayMs - The delay in milliseconds between retry attempts (default is 1000ms).
   * @returns A promise that resolves with the successful `Response` object or rejects with the last error.
   */
  private async fetchWithRetry(
    input: string | URL | globalThis.Request,
    init?: RequestInit,
    retries: number = 2,
    delayMs: number = 1000
  ): Promise<Response> {
    let lastError: unknown;

    if (retries < 0) {
      logger.warn(
        `Invalid retries value (${retries}). Falling back to a single fetch call.`
      );
      return fetch(input, init);
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(input, init);
        if (response.status === 500) {
          if (attempt === retries) {
            return response;
          }
          throw new Error("Server responded with status 500");
        }
        return response;
      } catch (error) {
        logger.error("Fetch attempt failed", {
          attempt: attempt + 1,
          totalAttempts: retries + 1,
          error: error instanceof Error ? error.message : error,
        });
        lastError = error;
      }

      // Wait before retrying
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    // All retry attempts failed; throw the last encountered error.
    throw lastError instanceof Error
      ? lastError
      : new Error("Unknown error occurred in fetchWithRetry");
  }
}
