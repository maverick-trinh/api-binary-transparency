import { SuiClient, SuiObjectResponse } from "@mysten/sui/client";
import { WalrusClient } from "@mysten/walrus";
import { bcs } from "@mysten/bcs";
import { base64UrlSafeEncode, getCurrentUTCTimestamp } from "../utils/helpers";
import { getSubdomainAndPath } from "../lib/domain_parsing";
import { PORTAL_DOMAIN_NAME_LENGTH } from "../config/environment";
import { ALLOWED_FILE_TYPES } from "../utils/constants";
import { standardUrlFetcher } from "../factory/url_fetcher_factory";
import logger from "../config/logger";

export class WalrusService {
  constructor(
    private suiClient: SuiClient,
    private walrusClient: WalrusClient
  ) {}

  async resolvePortalObjectId(url: URL): Promise<string | null> {
    const parseUrl = getSubdomainAndPath(url, PORTAL_DOMAIN_NAME_LENGTH);
    
    if (!parseUrl?.subdomain) {
      return null;
    }

    try {
      const urlFetcher = standardUrlFetcher;
      return await urlFetcher.resolveDomainAndFetchUrl(parseUrl, null);
    } catch (error) {
      logger.error('Failed to resolve portal object ID:', error);
      return null;
    }
  }

  async fetchBlobData(portalObjectId: string) {
    // Fetch the main Portal ObjectID
    console.log(`[3/5] Found Portal object ID: ${portalObjectId}`);

    // Get Blob IDs from the Portal's dynamic fields
    console.log(`[4/5] Fetching Portal object details...`);
    const portalObject: SuiObjectResponse = await this.suiClient.getObject({
      id: portalObjectId,
      options: { showContent: true },
    });
    
    console.log(`Portal object fetched:`, JSON.stringify(portalObject, null, 2));
    const blobTableId = (portalObject.data?.content as any)?.fields.id.id;
    console.log(`Blob table ID: ${blobTableId}`);

    if (!blobTableId) {
      throw new Error("Could not find the blob table in the Portal object.");
    }

    // Fetch all dynamic fields from the blob table
    const blobIdMap = await this.fetchBlobIdMap(blobTableId);
    
    if (blobIdMap.size === 0) {
      return { message: "Portal found, but it contains no blobs.", data: {} };
    }

    // Process blobs
    const results = await this.processBlobObjects(blobIdMap);

    return {
      message: "Successfully fetched data",
      data: {
        results: results,
        object_id: portalObjectId,
        time_stamp: getCurrentUTCTimestamp(),
      },
    };
  }

  private async fetchBlobIdMap(blobTableId: string): Promise<Map<string, string>> {
    console.log(`[4/5] Fetching dynamic fields from blob table: ${blobTableId}`);
    let blobCursor: string | null = null;
    const blobIdMap = new Map<string, string>();

    do {
      console.log(`Fetching dynamic fields with cursor: ${blobCursor}`);
      const dynamicFieldsResponse = await this.suiClient.getDynamicFields({
        parentId: blobTableId,
        cursor: blobCursor,
      });

      const { data, nextCursor, hasNextPage } = dynamicFieldsResponse;
      console.log(`Found ${data.length} dynamic fields, hasNextPage: ${hasNextPage}`);

      for (const field of data) {
        const filename = field.name.value as string;
        const blobObjectId = field.objectId;
        console.log(`Found blob: ${JSON.stringify(filename)} -> ${blobObjectId}`);
        blobIdMap.set(filename, blobObjectId);
      }
      blobCursor = hasNextPage ? nextCursor || null : null;
    } while (blobCursor);

    console.log(`Total blobs found: ${blobIdMap.size}`);
    return blobIdMap;
  }

  private async processBlobObjects(blobIdMap: Map<string, string>) {
    const blobObjectIds = Array.from(blobIdMap.values());
    console.log(`[5/5] Fetching ${blobObjectIds.length} blob objects...`);

    const blobObjects: SuiObjectResponse[] = await this.suiClient.multiGetObjects({
      ids: blobObjectIds,
      options: { showContent: true },
    });
    
    console.log(`Fetched ${blobObjects.length} blob objects`);

    const results: { [key: string]: any } = {};

    console.log(`Processing ${blobObjects.length} blob objects...`);
    for (let i = 0; i < blobObjects.length; i++) {
      const blobObject = blobObjects[i];
      console.log(`Processing blob object ${i + 1}/${blobObjects.length}`);

      try {
        const filename =
          [...blobIdMap].find(
            ([, id]) => id === blobObject.data?.objectId
          )?.[0] || "unknown";

        console.log(`Processing file: ${filename}`);

        if (blobObject.data && blobObject.data.content) {
          const result = await this.processSingleBlob(blobObject, ALLOWED_FILE_TYPES);
          if (result) {
            results[result.fileName] = result.data;
          }
        } else {
          console.log(`No content found in blob object for ${filename}`);
        }
      } catch (error: any) {
        const filename =
          [...blobIdMap].find(
            ([, id]) => id === blobObject.data?.objectId
          )?.[0] || "unknown";
        logger.error(`Error fetching blob for ${filename}:`, error);
        results[filename] = {
          blob_id: null,
          content: null,
          error: error.message,
        };
      }
    }

    console.log(`[5/5] Finished processing all blobs. Results:`, Object.keys(results));
    return results;
  }

  private async processSingleBlob(blobObject: SuiObjectResponse, allowedFileTypes: string[]) {
    const blobId = (blobObject.data!.content as any)?.fields?.value?.fields?.blob_id;
    const pathField = (blobObject.data!.content as any)?.fields?.name?.fields?.path;
    
    console.log(`Extracted - blobId: ${blobId}, pathField: ${pathField}`);

    if (!blobId || !pathField) {
      console.log(`Missing blobId or pathField`);
      return null;
    }

    const hasAllowedExtension = allowedFileTypes.some(ext => 
      pathField.toLowerCase().endsWith(ext)
    );
    
    console.log(`File ${pathField} has allowed extension: ${hasAllowedExtension}`);

    if (!hasAllowedExtension) {
      console.log(`Skipping file ${pathField} - not an allowed file type`);
      return null;
    }

    let formattedBlobId: string;

    try {
      if (typeof blobId === "string" && /^\d+$/.test(blobId)) {
        formattedBlobId = base64UrlSafeEncode(
          bcs.u256().serialize(blobId).toBytes()
        );
      } else {
        formattedBlobId = blobId.toString();
      }
      console.log(`Formatted blob ID: ${formattedBlobId}`);
    } catch (error) {
      logger.warn(`Error converting blob_id: ${error}`);
      formattedBlobId = blobId.toString();
    }

    console.log(`Fetching blob from Walrus with ID: ${formattedBlobId}`);
    const blob = await this.walrusClient.readBlob({
      blobId: formattedBlobId,
    });

    if (blob) {
      const blobContent = new TextDecoder().decode(blob);
      const fileName = pathField.split('/').pop() || pathField;
      
      console.log(`Successfully fetched blob for ${fileName}, size: ${blobContent.length}`);

      return {
        fileName,
        data: {
          blob_id: formattedBlobId,
          content: blobContent,
          size: blobContent.length,
        }
      };
    } else {
      console.log(`No data returned for blob ${blobId}`);
      const fileName = pathField.split('/').pop() || pathField;
      return {
        fileName,
        data: {
          blob_id: formattedBlobId,
          content: null,
          error: `No data returned for blob ${blobId}`,
        }
      };
    }
  }
}
