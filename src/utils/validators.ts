import { UrlValidate } from '../types';
import logger from '../config/logger';

export function validateUrl(urlString: string): UrlValidate {
  try {
    const url = new URL(urlString);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { isValid: false, error: "URL must use http or https protocol." };
    }
    return { isValid: true, url };
  } catch(error) {
    logger.error(`Error validating URL: ${error}`);
    return { isValid: false, error: "Invalid URL format." };
  }
}