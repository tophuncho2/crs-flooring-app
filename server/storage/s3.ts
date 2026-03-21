import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getStorageEnvironment } from "@/server/platform/env"

let cachedS3Client: S3Client | null = null

function getS3Client() {
  if (cachedS3Client) {
    return cachedS3Client
  }

  const storage = getStorageEnvironment()

  cachedS3Client = new S3Client({
    region: storage.defaultRegion,
    endpoint: storage.endpointUrl,
    forcePathStyle: true,
    credentials: {
      accessKeyId: storage.accessKeyId,
      secretAccessKey: storage.secretAccessKey,
    },
  })

  return cachedS3Client
}

function getBucketName() {
  return getStorageEnvironment().bucketName
}

export async function uploadFileToBucket(buffer: Buffer, fileName: string, contentType: string) {
  const key = `uploads/${fileName}`

  await getS3Client().send(
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
  const storage = getStorageEnvironment()

  return `${storage.endpointUrl}/${getBucketName()}/uploads/${fileName}`
}

export async function getFileFromBucket(fileName: string) {
  const result = await getS3Client().send(
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
