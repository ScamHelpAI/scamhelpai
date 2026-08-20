import jsQrImport from "jsqr";
import sharp from "sharp";
import { tool } from "ai";
import { z } from "zod";

type JsQrFn = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
) => { data: string } | null;

const jsQR = (jsQrImport as unknown as { default: JsQrFn }).default;

function isUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function decodeQr(base64Image: string) {
  const buffer = Buffer.from(base64Image, "base64");
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const imageData = new Uint8ClampedArray(
    data.buffer,
    data.byteOffset,
    data.byteLength,
  );
  const result = jsQR(imageData, info.width, info.height);

  if (!result) {
    return { payloads: [], destinations: [], decoded: false };
  }

  const payloads = [result.data];
  const destinations = payloads.filter(isUrl);

  return {
    decoded: true,
    payloads,
    destinations,
  };
}

export const decodeQrTool = tool({
  description:
    "Decodes QR codes from a base64-encoded image and returns any destinations.",
  inputSchema: z.object({
    image: z.string().describe("Base64-encoded image containing a QR code"),
  }),
  execute: async ({ image }) => decodeQr(image),
});
