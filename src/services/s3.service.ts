import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import { pipeline } from 'stream/promises';

export const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function presignPut(key: string, contentType = 'audio/webm', expires = 900) {
  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, cmd, { expiresIn: expires });
}

export async function presignGet(key: string, expires = 900) {
  const cmd = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: expires });
}

export async function downloadToTmp(key: string, dest: string) {
  const { Body } = await s3.send(new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  }));
  await pipeline(Body as NodeJS.ReadableStream, fs.createWriteStream(dest));
}
