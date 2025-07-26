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
 *         description: Successfully fetched blob data.
 *       400:
 *         description: Invalid request or missing parameters.
 *       404:
 *         description: SuiNS name or blobs not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/fetch-blobs", WalrusController.fetchBlobs);

export default router;
