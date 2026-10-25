/**
 * Thin Bun S3Client wrapper for MinIO / S3-compatible object storage.
 */
import { S3Client } from "bun";
import { env } from "../config/env.js";

let client: S3Client | null = null;

export function isS3Configured(): boolean {
  return Boolean(
    env.S3_ENDPOINT && env.S3_ACCESS_KEY && env.S3_SECRET_KEY && env.S3_BUCKET,
  );
}

export function getS3Client(): S3Client {
  if (!isS3Configured()) {
    throw new Error("S3 is not configured");
  }

  if (!client) {
    client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
      bucket: env.S3_BUCKET,
      region: env.S3_REGION,
      // MinIO and most local S3-compatible stores need path-style URLs.
      virtualHostedStyle: env.S3_FORCE_PATH_STYLE ? false : undefined,
    });
  }

  return client;
}

export function presignPutObject(params: {
  objectKey: string;
  contentType: string;
  expiresIn: number;
}): string {
  return getS3Client().presign(params.objectKey, {
    method: "PUT",
    type: params.contentType,
    expiresIn: params.expiresIn,
  });
}

export async function objectExists(objectKey: string): Promise<boolean> {
  return getS3Client().exists(objectKey);
}

export async function objectStat(objectKey: string): Promise<{
  size: number;
  type?: string;
} | null> {
  try {
    const stat = await getS3Client().stat(objectKey);
    return { size: stat.size, type: stat.type };
  } catch {
    return null;
  }
}

export async function readObjectBytes(
  objectKey: string,
): Promise<Uint8Array | null> {
  const file = getS3Client().file(objectKey);
  if (!(await file.exists())) return null;
  return new Uint8Array(await file.arrayBuffer());
}

export async function deleteObject(objectKey: string): Promise<void> {
  const file = getS3Client().file(objectKey);
  if (!(await file.exists())) return;
  await file.delete();
}
