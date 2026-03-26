import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

export type StorageEnvironment = {
  accessKeyId: string
  defaultRegion: string
  endpointUrl: string
  bucketName: string
  secretAccessKey: string
}

const clientCache = new Map<string, S3Client>()

function buildStorageCacheKey(env: StorageEnvironment) {
  return [
    env.endpointUrl,
    env.bucketName,
    env.defaultRegion,
    env.accessKeyId,
  ].join("|")
}

export function getStorageClient(env: StorageEnvironment) {
  const cacheKey = buildStorageCacheKey(env)
  const existing = clientCache.get(cacheKey)

  if (existing) {
    return existing
  }

  const client = new S3Client({
    region: env.defaultRegion,
    endpoint: env.endpointUrl,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  })

  clientCache.set(cacheKey, client)
  return client
}

export function buildBucketObjectUrl(env: StorageEnvironment, key: string) {
  const normalizedKey = key.replace(/^\/+/, "")
  return `${env.endpointUrl}/${env.bucketName}/${normalizedKey}`
}

export async function uploadBucketObject(
  env: StorageEnvironment,
  input: {
    data: Buffer
    key: string
    contentType: string
  },
) {
  await getStorageClient(env).send(
    new PutObjectCommand({
      Bucket: env.bucketName,
      Key: input.key,
      Body: input.data,
      ContentType: input.contentType,
    }),
  )

  return buildBucketObjectUrl(env, input.key)
}

export async function getBucketObject(env: StorageEnvironment, key: string) {
  const result = await getStorageClient(env).send(
    new GetObjectCommand({
      Bucket: env.bucketName,
      Key: key,
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
