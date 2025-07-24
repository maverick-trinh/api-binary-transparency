import { Router } from "express";
import { WalrusController } from "../controllers/walrus_controller";

const router = Router();

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
router.get("/fetch-blobs", WalrusController.fetchBlobs);

export default router;
