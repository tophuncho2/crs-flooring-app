import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

const {
  AWS_ACCESS_KEY_ID,
  AWS_DEFAULT_REGION,
  AWS_ENDPOINT_URL,
  AWS_S3_BUCKET_NAME,
  AWS_SECRET_ACCESS_KEY,
} = process.env

export const s3Client = new S3Client({
  region: AWS_DEFAULT_REGION,
  endpoint: AWS_ENDPOINT_URL,
  forcePathStyle: true,
  credentials: AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
})

function getBucketName() {
  if (!AWS_S3_BUCKET_NAME) {
    throw new Error("AWS_S3_BUCKET_NAME is not configured")
  }

  return AWS_S3_BUCKET_NAME
}

export async function uploadFileToBucket(buffer: Buffer, fileName: string, contentType: string) {
  const key = `uploads/${fileName}`

  await s3Client.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  )

  return buildBucketFileUrl(fileName)
}

export function buildBucketFileUrl(fileName: string) {
  if (!AWS_ENDPOINT_URL) {
    throw new Error("AWS_ENDPOINT_URL is not configured")
  }

  return `${AWS_ENDPOINT_URL}/${getBucketName()}/uploads/${fileName}`
}

export async function getFileFromBucket(fileName: string) {
  const result = await s3Client.send(
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: `uploads/${fileName}`,
    }),
  )
  const bytes = await result.Body?.transformToByteArray()

  if (!bytes) {
    throw new Error("Bucket file is empty or missing")
  }

  return {
    data: Buffer.from(bytes),
    contentType: result.ContentType ?? "application/octet-stream",
  }
}
