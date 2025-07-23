import express, { Request, Response } from "express";
import {
  SuiClient,
  getFullnodeUrl,
  SuiObjectResponse,
} from "@mysten/sui/client";
import { bcs } from "@mysten/bcs";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { WalrusClient } from "@mysten/walrus";
import { getDomain, getSubdomainAndPath } from "./lib/domain-parsing";
import { standardUrlFetcher } from "./url_fetcher_factory";
import { UrlFetcher } from "./lib/url_fetcher";


// --- Configuration ---
// Set up the Sui client to connect to the mainnet.
const NETWORK = "mainnet";
const suiClient = new SuiClient({ url: getFullnodeUrl(NETWORK) });
const walrusClient = new WalrusClient({
  network: NETWORK,
  suiClient,
});
const app = express();
const PORT: number = parseInt(process.env.PORT || "3000", 10);

// This is an example object type for the main "Portal" object.
// In a real-world scenario, this would be the specific package::module::struct
// that defines the main object holding the blob metadata.
// const PORTAL_OBJECT_TYPE =
//   "0xf99aee9f21493e1590e7e5a9aea6f343a1f381031a04a732724871fc294be799";
const PORTAL_DOMAIN_NAME_LENGTH = 7; // Length of "wal.app"

function base64UrlSafeEncode(data: Uint8Array): string {
  let base64 = arrayBufferToBase64(data);
  // Use the URL-safe Base 64 encoding by removing padding and swapping characters.
  return base64.replace(/\//g, "_").replace(/\+/g, "-").replace(/=/g, "");
}

function arrayBufferToBase64(bytes: Uint8Array): string {
  // Convert each byte in the array to the correct character
  const binaryString = Array.from(bytes, (byte) =>
    String.fromCharCode(byte)
  ).join("");
  // Encode the binary string to base64 using btoa
  return btoa(binaryString);
}

// --- Swagger Configuration ---
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SuiNS Blob Fetcher API with Walrus SDK",
      version: "1.0.0",
      description:
        "API to resolve SuiNS names and fetch associated blob data from the Walrus network using Walrus SDK",
      contact: {
        name: "API Support",
        email: "support@example.com",
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
    ],
  },
  apis: ["./index.ts"], // Path to the API files
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Setup Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// --- API Endpoint ---
// This endpoint implements the workflow: SuiNS -> ObjectID -> Blob IDs -> Blob Data

/**
 * @swagger
 * /api/fetch-blobs:
 *   get:
 *     summary: Fetch blob data associated with a SuiNS name using Walrus SDK
 *     description: |
 *       This endpoint resolves a SuiNS name to an owner's address, finds their Portal object,
 *       extracts blob IDs from the Portal's dynamic fields, and returns the decoded blob data using Walrus SDK.
 *     tags:
 *       - Blob Operations
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *           example: "https://flatland.wal.app/"
 *         description: The url from Walrus mainet
 *     responses:
 *       200:
 *         description: Successfully fetched blob data using Walrus SDK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Successfully fetched data for walrus.sui"
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       blob_id:
 *                         type: string
 *                         description: The Walrus blob ID
 *                       content:
 *                         type: string
 *                         description: The decoded blob content
 *                       size:
 *                         type: number
 *                         description: Size of the content in characters
 *                       error:
 *                         type: string
 *                         description: Error message if blob fetch failed
 *                   example:
 *                     "file1.txt":
 *                       blob_id: "AbCdEf123..."
 *                       content: "Content of file1"
 *                       size: 16
 *                     "file2.json":
 *                       blob_id: "XyZ789..."
 *                       content: "{\"key\": \"value\"}"
 *                       size: 16
 *             examples:
 *               success:
 *                 summary: Successful response with blob data from Walrus
 *                 value:
 *                   message: "Successfully fetched data for walrus.sui"
 *                   data:
 *                     "readme.md": "# My Project\nThis is a sample readme file."
 *                     "config.json": "{\"version\": \"1.0.0\", \"name\": \"MyApp\"}"
 *               empty:
 *                 summary: Portal found but no blobs
 *                 value:
 *                   message: "Portal found, but it contains no blobs."
 *                   data: {}
 *       400:
 *         description: Bad request - SuiNS name is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "SuiNS name is required. Use ?name=<your-name>.sui"
 *       404:
 *         description: Not found - SuiNS name not found, no Portal object, or no blob table
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *               examples:
 *                 suins_not_found:
 *                   summary: SuiNS name not found
 *                   value:
 *                     error: "SuiNS name 'example.sui' not found or has no address."
 *                 no_portal:
 *                   summary: No Portal object found
 *                   value:
 *                     error: "No Portal object found for the owner of 'example.sui'."
 *                 no_blob_table:
 *                   summary: No blob table found
 *                   value:
 *                     error: "Could not find the blob table in the Portal object."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "An internal server error occurred."
 *                 details:
 *                   type: string
 *                   example: "Connection timeout or Walrus network error"
 */
app.get("/api/fetch-blobs", async (req: Request, res: Response) => {
  // Get the URL from the 'name' query parameter
  const nameParam = req.query.name as string;
  
  if (!nameParam) {
    return res.status(400).json({ 
      error: "URL is required. Use ?name=<walrus-url>" 
    });
  }

  let url: URL;
  try {
    // The nameParam should be the Walrus URL (e.g., https://flatland.wal.app/)
    url = new URL(nameParam);
  } catch (error) {
    return res.status(400).json({ 
      error: "Invalid URL format in name parameter" 
    });
  }

  console.log(`Target URL: ${url}`);
  let portalObjectId: string | undefined;
  const parsedUrl = getSubdomainAndPath(url, PORTAL_DOMAIN_NAME_LENGTH);
  const portalDomain = getDomain(url, PORTAL_DOMAIN_NAME_LENGTH);
  const requestDomain = getDomain(url, PORTAL_DOMAIN_NAME_LENGTH);
  console.log(`Parse url: ${JSON.stringify(parsedUrl)}`);
  if (parsedUrl) {
    const urlFetcher = standardUrlFetcher;
    if (requestDomain == portalDomain && parsedUrl.subdomain) {
      portalObjectId = await urlFetcher.resolveDomainAndFetchUrl(parsedUrl, null);
      console.log("Portal object id:", portalObjectId);
    }
  }

  if (!portalObjectId) {
    return res.status(404).json({ 
      error: "Could not resolve portal object ID from the provided URL." 
    });
  }

  try {
    // --- Step 2: Fetch the main Portal ObjectID ---
    console.log(`[3/5] Found Portal object ID: ${portalObjectId}`);

    // --- Step 3: Get Blob IDs from the Portal's dynamic fields ---
    console.log(`[4/5] Fetching Portal object details...`);
    const portalObject: SuiObjectResponse = await suiClient.getObject({
      id: portalObjectId,
      options: { showContent: true },
    });
    
    console.log(`Portal object fetched:`, JSON.stringify(portalObject, null, 2));
    const blobTableId = (portalObject.data?.content as any)?.fields.id.id;
    console.log(`Blob table ID: ${blobTableId}`);

    if (!blobTableId) {
      console.log(`Error: No blob table found in portal object`);
      return res
        .status(404)
        .json({ error: "Could not find the blob table in the Portal object." });
    }

    console.log(`[4/5] Fetching dynamic fields from blob table: ${blobTableId}`);
    // Fetch all dynamic fields from the blob table
    let blobCursor: string | null = null;
    const blobIdMap = new Map<string, string>();
    do {
      console.log(`Fetching dynamic fields with cursor: ${blobCursor}`);
      const dynamicFieldsResponse = await suiClient.getDynamicFields({
        parentId: blobTableId,
        cursor: blobCursor,
      });

      const { data, nextCursor, hasNextPage } = dynamicFieldsResponse;
      console.log(`Found ${data.length} dynamic fields, hasNextPage: ${hasNextPage}`);

      for (const field of data) {
        const filename = field.name.value as string;
        const blobObjectId = field.objectId;
        console.log(`Found blob: ${filename} -> ${blobObjectId}`);
        blobIdMap.set(filename, blobObjectId);
      }
      blobCursor = hasNextPage ? nextCursor || null : null;
    } while (blobCursor);

    console.log(`Total blobs found: ${blobIdMap.size}`);
    const blobObjectIds = Array.from(blobIdMap.values());

    if (blobObjectIds.length === 0) {
      console.log(`No blobs found in portal`);
      return res
        .status(200)
        .json({ message: "Portal found, but it contains no blobs.", data: {} });
    }

    console.log(`[5/5] Fetching ${blobObjectIds.length} blob objects...`);
    // --- Step 4: Fetch all blob objects first to get their blob_id values ---
    const blobObjects: SuiObjectResponse[] = await suiClient.multiGetObjects({
      ids: blobObjectIds,
      options: { showContent: true },
    });
    
    console.log(`Fetched ${blobObjects.length} blob objects`);

    // --- Step 5: Extract blob_id from each object and fetch data using Walrus SDK ---
    const results: { [key: string]: any } = {};
    const allowedFileTypes = ['.html', '.css', '.js', 'mjs'];

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
          console.log(`Blob object content:`, JSON.stringify(blobObject.data.content, null, 2));
          const blobId = (blobObject.data.content as any)?.fields?.value?.fields
            ?.blob_id;
          const pathField = (blobObject.data.content as any)?.fields?.name?.fields?.path;
          
          console.log(`Extracted - blobId: ${blobId}, pathField: ${pathField}`);

          if (blobId && pathField) {
            const hasAllowedExtension = allowedFileTypes.some(ext => 
              pathField.toLowerCase().endsWith(ext)
            );
            
            console.log(`File ${pathField} has allowed extension: ${hasAllowedExtension}`);

            if (!hasAllowedExtension) {
              console.log(`Skipping file ${pathField} - not an allowed file type`);
              continue;
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
              console.warn(`Error converting blob_id: ${error}`);
              formattedBlobId = blobId.toString();
            }

            console.log(`Fetching blob from Walrus with ID: ${formattedBlobId}`);
            const blob = await walrusClient.readBlob({
              blobId: formattedBlobId,
            });

            if (blob) {
              const blobContent = new TextDecoder().decode(blob);
              const fileName = pathField.split('/').pop() || pathField;
              
              console.log(`Successfully fetched blob for ${fileName}, size: ${blobContent.length}`);

              results[fileName] = {
                blob_id: formattedBlobId,
                content: blobContent,
                size: blobContent.length,
              };

            } else {
              console.log(`No data returned for blob ${blobId}`);
              results[filename] = {
                blob_id: formattedBlobId,
                content: null,
                error: `No data returned for blob ${blobId}`,
              };
            }
          } else {
            console.log(`Missing blobId or pathField for ${filename}`);
          }
        } else {
          console.log(`No content found in blob object for ${filename}`);
        }
      } catch (error: any) {
        const filename =
          [...blobIdMap].find(
            ([, id]) => id === blobObject.data?.objectId
          )?.[0] || "unknown";
        console.error(`Error fetching blob for ${filename}:`, error);
        results[filename] = {
          blob_id: null,
          content: null,
          error: error.message,
        };
      }
    }

    console.log(`[5/5] Finished processing all blobs. Results:`, Object.keys(results));

    res.status(200).json({
      message: `Successfully fetched data `,
      data: {
        results: results,
        object_id: portalObjectId,
        network: NETWORK,
        time_stamp: new Date().toLocaleDateString("en-GB", {
          timeZone: "UTC",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      },
    });
  } catch (error: any) {
    console.error("An unexpected error occurred:", error);
    res
      .status(500)
      .json({
        error: "An internal server error occurred.",
        details: error.message,
      });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
});
