import { S3Client, GetObjectCommand, PutObjectCommand }
  from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { pipeline } from 'stream/promises';
import fs from 'fs';

export const s3 = new S3Client({ region: process.env.AWS_REGION });

export const presignPut = (key: string, exp = 900) =>
  getSignedUrl(s3,
    new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, ContentType: 'audio/webm' }), { expiresIn: exp });

export const presignGet = (key: string, exp = 900) =>
  getSignedUrl(s3,
    new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    { expiresIn: exp });

export const downloadToTmp = async (key: string, dest: string) => {
  const { Body } = await s3.send(
    new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })
  );
  await pipeline(Body as NodeJS.ReadableStream, fs.createWriteStream(dest));
};
