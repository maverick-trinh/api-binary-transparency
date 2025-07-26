export const MAX_REDIRECT_DEPTH = 3;

/**
 * Allowed file types for blob processing
 */
export const ALLOWED_FILE_TYPES = ['.html', '.css', '.js', '.mjs', '.jsx', '.tsx', '.json'];

export const SITE_NAMES: { [key: string]: string } = {
    // Any hardcoded (non suins) name -> object_id mappings go here
    // e.g.,
    // landing: "0x1234..."
};
// The default portal to redirect to if the browser does not support service workers.
export const FALLBACK_PORTAL = "blob.store";