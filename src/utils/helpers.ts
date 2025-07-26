import { Response } from 'express';
import { HttpStatusCodes } from '../enums';
import { ApiResponse, SuccessResponse, ErrorResponse } from '../types';

const { subtle } = globalThis.crypto;

/**
 * Converts the given bytes to Base 64, and then converts it to URL-safe Base 64.
 *
 * See [wikipedia](https://en.wikipedia.org/wiki/Base64#URL_applications).
 */
export function base64UrlSafeEncode(data: Uint8Array): string {
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

/**
 * Calculates SHA-256 hash of input message.
 * @param message ArrayBuffer to hash
 * @returns Promise<Uint8Array> Resulting hash as Uint8Array
 */
export async function sha256(message: ArrayBuffer): Promise<Uint8Array> {
    const hash = await subtle.digest("SHA-256", message);
    return new Uint8Array(hash);
}

/**
 * Returns the URL to fetch the blob of given ID from the aggregator/cache.
 *
 * @param blob_id - The blob ID to fetch from the aggregator.
 * @param aggregatorUrl - The aggregator URL string.
 */
export function aggregatorEndpoint(blob_id: string, aggregatorUrl: string): URL {
    if (aggregatorUrl.endsWith("/")) {
        throw new Error("Aggregator URL must not end with a slash.");
    }
    return new URL(`${aggregatorUrl}/v1/blobs/${encodeURIComponent(blob_id)}`) as unknown as URL;
}

/**
 * Get current time and date (UTC)
 */

export function getCurrentUTCTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  statusCode: number = 200,
  message?: string
): SuccessResponse<T> {
  return {
    success: true,
    statusCode,
    message,
    data,
    timestamp: getCurrentUTCTimestamp()
  };
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  message: string,
  statusCode: number = 500,
  details?: string,
  code?: string
): ErrorResponse {
  return {
    success: false,
    statusCode,
    error: {
      message,
      details,
      code
    },
    timestamp: getCurrentUTCTimestamp()
  };
}

/**
 * Sends a standardized success response
 */
export function sendSuccessResponse<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  message?: string
): Response {
  const response = createSuccessResponse(data, statusCode, message);
  return res.status(statusCode).json(response);
}

/**
 * Sends a standardized error response using HttpStatusCodes
 */
export function sendErrorResponse(
  res: Response,
  message: string,
  statusCode: HttpStatusCodes | number = 500,
  details?: string,
  code?: string
): Response {
  const response = createErrorResponse(message, statusCode, details, code);
  return res.status(statusCode).json(response);
}