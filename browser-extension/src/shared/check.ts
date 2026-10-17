export type CheckStatus = "safe" | "warning" | "danger";

export type CheckUrlResult = {
  url: string;
  status: CheckStatus;
  score: number;
  reasons: string[];
  checkedAt: string;
  cached: boolean;
};

export type CheckUrlsResponse = {
  results: CheckUrlResult[];
};

export const CHECK_URLS_BATCH_SIZE = 100;

export function chunkUrls(urls: string[], size: number): string[][] {
  if (size <= 0) return [urls];
  const chunks: string[][] = [];
  for (let i = 0; i < urls.length; i += size) {
    chunks.push(urls.slice(i, i + size));
  }
  return chunks;
}
