import { Request, Response } from "express";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { WalrusClient } from "@mysten/walrus";
import { WalrusService } from "../services/walrus_service";
import { SUI_NETWORK, WALRUS_NETWORK } from '../config/environment';
import logger from "../config/logger";
import { validateUrl } from "../utils/validators";

const suiClient = new SuiClient({ 
  url: getFullnodeUrl(SUI_NETWORK as "testnet" | "mainnet" | "devnet") 
});

const walrusClient = new WalrusClient({
  network: WALRUS_NETWORK,
  suiClient,
});

const walrusService = new WalrusService(suiClient, walrusClient);

export class WalrusController {
  static async fetchBlobs(req: Request, res: Response): Promise<Response> {
    try {
      const nameParam = req.query.name as string;
      
      if (!nameParam) {
        return res.status(400).json({ 
          error: "Name parameter is required" 
        });
      }

      const urlValidationResult = validateUrl(nameParam);

      if (!urlValidationResult.isValid) {
        return res.status(400).json({ 
          error: urlValidationResult.error 
        });
      }

      const url = urlValidationResult.url;
      const portalObjectId = await walrusService.resolvePortalObjectId(url);
      
      if (!portalObjectId) {
        return res.status(404).json({ 
          error: "Could not resolve portal object ID from the provided URL." 
        });
      }

      const result = await walrusService.fetchBlobData(portalObjectId);
      
      return res.status(200).json({
        success: true,
        data: {
          ...result.data,
          network: WALRUS_NETWORK,
        }
      });

    } catch (error: unknown) {
      // Better error handling
      if (error instanceof Error) {
        logger.error("An unexpected error occurred:", {
          message: error.message,
          stack: error.stack,
          url: req.query.name
        });
        
        // Return appropriate error based on type
        if (error.message.includes('network') || error.message.includes('connection')) {
          return res.status(503).json({
            error: "Service temporarily unavailable",
            details: "Unable to connect to blockchain network"
          });
        }
      } else {
        logger.error("An unknown error occurred:", error);
      }

      return res.status(500).json({
        error: "An internal server error occurred.",
        // Don't expose internal error details in production
        details: process.env.NODE_ENV === 'development' 
          ? (error as Error)?.message 
          : 'Internal server error'
      });
    }
  }
}