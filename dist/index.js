"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@mysten/sui/client");
const bcs_1 = require("@mysten/bcs");
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const walrus_1 = require("@mysten/walrus");
// --- Configuration ---
// Set up the Sui client to connect to the mainnet.
const NETWORK = "testnet";
const suiClient = new client_1.SuiClient({ url: (0, client_1.getFullnodeUrl)(NETWORK) });
const walrusClient = new walrus_1.WalrusClient({
    network: NETWORK,
    suiClient,
});
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || "3000", 10);
// This is an example object type for the main "Portal" object.
// In a real-world scenario, this would be the specific package::module::struct
// that defines the main object holding the blob metadata.
const PORTAL_OBJECT_TYPE = "0x2c68443db9e5c8909351414a8b7121659a35113b97a20a917955aa88c4d81f59::portal::Portal";
function base64UrlSafeEncode(data) {
    let base64 = arrayBufferToBase64(data);
    // Use the URL-safe Base 64 encoding by removing padding and swapping characters.
    return base64.replace(/\//g, "_").replace(/\+/g, "-").replace(/=/g, "");
}
function arrayBufferToBase64(bytes) {
    // Convert each byte in the array to the correct character
    const binaryString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
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
            description: "API to resolve SuiNS names and fetch associated blob data from the Walrus network using Walrus SDK",
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
const swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
// Setup Swagger UI
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
/**
 * A helper function to find the first object of a specific type owned by an address.
 * @param {string} ownerAddress - The Sui address of the owner.
 * @param {string} objectType - The type of object to search for.
 * @returns {Promise<string|null>} The object ID if found, otherwise null.
 */
async function findObjectByType(ownerAddress, objectType) {
    let cursor = null;
    let objectId = null;
    // Paginate through objects owned by the address until we find one that matches our type.
    do {
        const ownedObjectsResponse = await suiClient.getOwnedObjects({
            owner: ownerAddress,
            filter: { StructType: objectType },
            options: { showType: true },
            cursor: cursor,
        });
        const { data, nextCursor, hasNextPage } = ownedObjectsResponse;
        if (data && data.length > 0) {
            const foundObject = data.find((obj) => obj.data?.type === objectType);
            if (foundObject && foundObject.data) {
                objectId = foundObject.data.objectId;
                break; // Exit loop once found
            }
        }
        cursor = hasNextPage ? nextCursor || null : null;
    } while (cursor);
    return objectId;
}
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
 *
 *       **Workflow:**
 *       1. Resolve SuiNS name to owner's address
 *       2. Find Portal object owned by that address
 *       3. Extract blob IDs from Portal's dynamic fields
 *       4. Use Walrus SDK to fetch blob data from Walrus network
 *       5. Return formatted results
 *     tags:
 *       - Blob Operations
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *           example: "walrus.sui"
 *         description: The SuiNS name to resolve (must end with .sui)
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
app.get("/api/fetch-blobs", async (req, res) => {
    // Ensure the query parameter is treated as a string.
    const suinsName = req.query.name;
    if (!suinsName) {
        return res
            .status(400)
            .json({ error: "SuiNS name is required. Use ?name=<your-name>.sui" });
    }
    console.log(`[1/5] Starting process for SuiNS name: ${suinsName}`);
    try {
        // --- Step 1: Resolve SuiNS Name to get the owner's address ---
        const ownerAddress = await suiClient.resolveNameServiceAddress({
            name: suinsName,
        });
        // if (!ownerAddress) {
        //     console.error(`Failed to resolve SuiNS name: ${suinsName}`);
        //     return res.status(404).json({ error: `SuiNS name '${suinsName}' not found or has no address.` });
        // }
        console.log(`[2/5] Resolved address: ${ownerAddress}`);
        // --- Step 2: Fetch the main Portal ObjectID ---
        // const portalObjectId = await findObjectByType(ownerAddress, PORTAL_OBJECT_TYPE);
        const portalObjectId = "0x2e35ae0df36233fc98d2655fb6b31b75f7519fe89ffb5f186b8fd205a2a6990c";
        if (!portalObjectId) {
            console.error(`Could not find Portal object for address: ${ownerAddress}`);
            return res
                .status(404)
                .json({
                error: `No Portal object found for the owner of '${suinsName}'.`,
            });
        }
        console.log(`[3/5] Found Portal object ID: ${portalObjectId}`);
        // --- Step 3: Get Blob IDs from the Portal's dynamic fields ---
        const portalObject = await suiClient.getObject({
            id: portalObjectId,
            options: { showContent: true },
        });
        // Use type-safe access to nested fields.
        const blobTableId = portalObject.data?.content?.fields.id.id;
        if (!blobTableId) {
            return res
                .status(404)
                .json({ error: "Could not find the blob table in the Portal object." });
        }
        // Fetch all dynamic fields from the blob table
        let blobCursor = null;
        const blobIdMap = new Map();
        do {
            const dynamicFieldsResponse = await suiClient.getDynamicFields({
                parentId: blobTableId,
                cursor: blobCursor,
            });
            const { data, nextCursor, hasNextPage } = dynamicFieldsResponse;
            for (const field of data) {
                const filename = field.name.value;
                const blobObjectId = field.objectId;
                blobIdMap.set(filename, blobObjectId);
            }
            blobCursor = hasNextPage ? nextCursor || null : null;
        } while (blobCursor);
        const blobObjectIds = Array.from(blobIdMap.values());
        console.log(`[4/5] Found ${blobObjectIds.length} blob IDs: ${blobObjectIds}`);
        if (blobObjectIds.length === 0) {
            return res
                .status(200)
                .json({ message: "Portal found, but it contains no blobs.", data: {} });
        }
        // --- Step 4: Fetch all blob objects first to get their blob_id values ---
        const blobObjects = await suiClient.multiGetObjects({
            ids: blobObjectIds,
            options: { showContent: true },
        });
        // --- Step 5: Extract blob_id from each object and fetch data using Walrus SDK ---
        const results = {};
        const allowedFileTypes = ['.html', '.css', '.js'];
        for (let i = 0; i < blobObjects.length; i++) {
            const blobObject = blobObjects[i];
            try {
                const filename = [...blobIdMap].find(([, id]) => id === blobObject.data?.objectId)?.[0] || "unknown";
                console.log(`Processing blob object for ${JSON.stringify(filename)} with ID: ${blobObject.data?.objectId}`);
                if (blobObject.data && blobObject.data.content) {
                    const blobId = blobObject.data.content?.fields?.value?.fields
                        ?.blob_id;
                    const pathField = blobObject.data.content?.fields?.name?.fields?.path;
                    if (blobId && pathField) {
                        console.log(`Raw blob_id: ${blobId} for file: ${JSON.stringify(filename)}`);
                        const hasAllowedExtension = allowedFileTypes.some(ext => pathField.toLowerCase().endsWith(ext));
                        if (!hasAllowedExtension)
                            continue;
                        let formattedBlobId;
                        try {
                            if (typeof blobId === "string" && /^\d+$/.test(blobId)) {
                                formattedBlobId = base64UrlSafeEncode(bcs_1.bcs.u256().serialize(blobId).toBytes());
                            }
                            else {
                                formattedBlobId = blobId.toString();
                            }
                        }
                        catch (error) {
                            console.warn(`Error converting blob_id: ${error}`);
                            formattedBlobId = blobId.toString();
                        }
                        console.log(`Using Walrus SDK to fetch blob ID: ${formattedBlobId} for file: ${JSON.stringify(filename)}`);
                        const blob = await walrusClient.readBlob({
                            blobId: formattedBlobId,
                        });
                        if (blob) {
                            const blobContent = new TextDecoder().decode(blob);
                            const fileName = pathField.split('/').pop() || pathField;
                            results[fileName] = {
                                blob_id: formattedBlobId,
                                content: blobContent,
                                size: blobContent.length,
                            };
                            console.log(`Successfully fetched ${filename} (${blobContent.length} characters)`);
                        }
                        else {
                            console.warn(`No data returned for blob ${blobId}`);
                            results[filename] = {
                                blob_id: formattedBlobId,
                                content: null,
                                error: `No data returned for blob ${blobId}`,
                            };
                        }
                    }
                }
            }
            catch (error) {
                const filename = [...blobIdMap].find(([, id]) => id === blobObject.data?.objectId)?.[0] || "unknown";
                console.error(`Error fetching blob for ${filename}:`, error);
                results[filename] = {
                    blob_id: null,
                    content: null,
                    error: error.message,
                };
            }
        }
        console.log(`[5/5] Finish`);
        res.status(200).json({
            message: `Successfully fetched data for ${suinsName}`,
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
    }
    catch (error) {
        console.error("An unexpected error occurred:", error);
        res
            .status(500)
            .json({
            error: "An internal server error occurred.",
            details: error.message,
        });
    }
});
/**
 * @swagger
 * /:
 *   get:
 *     summary: API health check and information
 *     description: Returns basic information about the API and available endpoints
 *     tags:
 *       - Health Check
 *     responses:
 *       200:
 *         description: API is running successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "SuiNS Blob Fetcher API is running"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     api:
 *                       type: string
 *                       example: "/api/fetch-blobs"
 *                     docs:
 *                       type: string
 *                       example: "/api-docs"
 */
app.get("/", (req, res) => {
    res.json({
        message: "SuiNS Blob Fetcher API is running",
        version: "1.0.0",
        endpoints: {
            api: "/api/fetch-blobs",
            docs: "/api-docs",
        },
    });
});
// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
    console.log("Try the API: http://localhost:3000/api/fetch-blobs?name=walrus.sui");
});
//# sourceMappingURL=index.js.map