/**
 * Upload rules for analysis assets: allowed content types, size cap, and
 * object-key layout in the bucket.
 */

export const MAX_ASSET_BYTES = 25 * 1024 * 1024;
export const PRESIGN_EXPIRES_IN_SECONDS = 15 * 60;

const ALLOWED_EXACT = new Set([
  "application/pdf",
  "message/rfc822",
  "text/plain",
]);

const ALLOWED_PREFIXES = ["image/", "audio/"] as const;

export function normalizeContentType(contentType: string): string {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function isAllowedContentType(contentType: string): boolean {
  const normalized = normalizeContentType(contentType);
  if (!normalized) return false;
  if (ALLOWED_EXACT.has(normalized)) return true;
  return ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function assertAllowedContentType(
  contentType: string,
  sizeBytes?: number,
): string {
  const normalized = normalizeContentType(contentType);
  if (!isAllowedContentType(normalized)) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }
  if (sizeBytes !== undefined && sizeBytes > MAX_ASSET_BYTES) {
    throw new Error(
      `Asset too large: ${sizeBytes} bytes (max ${MAX_ASSET_BYTES})`,
    );
  }
  return normalized;
}

export function buildAssetObjectKey(assetId: string): string {
  return `assets/${assetId}`;
}
