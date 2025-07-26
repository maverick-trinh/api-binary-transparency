import { Request, Response } from "express";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { WalrusClient } from "@mysten/walrus";
import { WalrusService } from "../services/walrus_service";
import { SUI_NETWORK, WALRUS_NETWORK } from '../config/environment';
import { HttpStatusCodes } from '../enums';
import { sendSuccessResponse, sendErrorResponse } from '../utils/helpers';
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
        return sendErrorResponse(
          res,
          "Name parameter is required",
          HttpStatusCodes.BAD_REQUEST,
          "The 'name' query parameter must be provided"
        );
      }

      const urlValidationResult = validateUrl(nameParam);

      if (!urlValidationResult.isValid) {
        return sendErrorResponse(
          res,
          "Invalid URL format",
          HttpStatusCodes.BAD_REQUEST,
          urlValidationResult.error
        );
      }

      const url = urlValidationResult.url;
      const portalObjectId = await walrusService.resolvePortalObjectId(url);
      
      if (!portalObjectId) {
        return sendErrorResponse(
          res,
          "Resource not found",
          HttpStatusCodes.NOT_FOUND,
          "Could not resolve portal object ID from the provided URL"
        );
      }

      const result = await walrusService.fetchBlobData(portalObjectId);
      
      return sendSuccessResponse(
        res,
        {
          ...result.data,
          network: WALRUS_NETWORK,
        },
        HttpStatusCodes.OK,
        "Blob data fetched successfully"
      );

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
          return sendErrorResponse(
            res,
            "Service temporarily unavailable",
            HttpStatusCodes.SERVICE_UNAVAILABLE,
            "Unable to connect to blockchain network",
            "NETWORK_ERROR"
          );
        }
      } else {
        logger.error("An unknown error occurred:", error);
      }

      return sendErrorResponse(
        res,
        "Internal server error",
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
        process.env.NODE_ENV === 'development' 
          ? (error as Error)?.message 
          : 'An unexpected error occurred',
        "INTERNAL_ERROR"
      );
    }
  }
}