import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function uploadFileToBucket(buffer, fileName, contentType) {
  const key = `uploads/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  return buildBucketFileUrl(fileName);
}

export function buildBucketFileUrl(fileName) {
  return `${process.env.AWS_ENDPOINT_URL}/${process.env.AWS_S3_BUCKET_NAME}/uploads/${fileName}`;
}

export async function getFileFromBucket(fileName) {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `uploads/${fileName}`,
  });

  const result = await s3Client.send(command);
  const bytes = await result.Body?.transformToByteArray();

  if (!bytes) {
    throw new Error("Bucket file is empty or missing")
  }

  return {
    data: Buffer.from(bytes),
    contentType: result.ContentType ?? "application/octet-stream",
  };
}
