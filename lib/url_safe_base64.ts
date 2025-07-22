export function base64UrlSafeEncode(data: Uint8Array): string {
    let base64 = arrayBufferToBase64(data);
    // Use the URL-safe Base 64 encoding by removing padding and swapping characters.
    return base64.replace("/", "_").replace("+", "-").replace("=", "");
}

function arrayBufferToBase64(bytes: Uint8Array): string {
    // Convert each byte in the array to the correct character
    const binaryString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    // Encode the binary string to base64 using btoa
    return btoa(binaryString);
}
