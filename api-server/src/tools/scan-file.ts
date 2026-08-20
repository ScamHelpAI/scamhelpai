import { createHash } from "node:crypto";
import { checkVtHash } from "./shared/virustotal.js";
import { tool } from "ai";
import { z } from "zod";

const URL_RE = /https?:\/\/[^\s"'<>]+/gi;
const MACRO_EXTENSIONS = new Set([".docm", ".xlsm", ".pptm", ".dotm"]);

function detectMime(buffer: Buffer, filename?: string): string {
  if (buffer[0] === 0x25 && buffer[1] === 0x50) return "application/pdf";
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) return "application/zip";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (filename) {
    const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
    if (ext) return `application/octet-stream (${ext})`;
  }
  return "application/octet-stream";
}

export async function scanFile(base64Content: string, filename?: string) {
  const buffer = Buffer.from(base64Content, "base64");
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const md5 = createHash("md5").update(buffer).digest("hex");
  const mimeType = detectMime(buffer, filename);

  const embeddedUrls = [
    ...new Set(buffer.toString("latin1").match(URL_RE) ?? []),
  ].slice(0, 50);

  const ext = filename?.slice(filename.lastIndexOf(".")).toLowerCase();
  const hasMacros = ext ? MACRO_EXTENSIONS.has(ext) : false;

  const vt = await checkVtHash(sha256);

  return {
    filename: filename ?? null,
    mimeType,
    size: buffer.length,
    hashes: { sha256, md5 },
    embeddedUrls,
    hasMacros,
    malwareScan: vt
      ? {
          malicious: vt.malicious > 0,
          maliciousCount: vt.malicious,
          suspiciousCount: vt.suspicious,
          sources: vt.sources.slice(0, 10),
        }
      : null,
  };
}

export const scanFileTool = tool({
  description:
    "Returns file type, hashes, embedded URLs, suspicious macro indicators, and malware scan results.",
  inputSchema: z.object({
    file: z
      .string()
      .describe("Base64-encoded file content"),
    filename: z
      .string()
      .optional()
      .describe("Original filename, if known"),
  }),
  execute: async ({ file, filename }) => scanFile(file, filename),
});
