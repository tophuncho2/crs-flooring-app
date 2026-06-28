import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

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
    /**
     * Optional `Cache-Control` response header stored on the object. S3/MinIO
     * echoes it on GET, so the browser caches the bytes — used for static brand
     * assets (e.g. the print logo) that change rarely.
     */
    cacheControl?: string
  },
) {
  await getStorageClient(env).send(
    new PutObjectCommand({
      Bucket: env.bucketName,
      Key: input.key,
      Body: input.data,
      ContentType: input.contentType,
      CacheControl: input.cacheControl,
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

export async function bucketObjectExists(env: StorageEnvironment, key: string) {
  try {
    await getStorageClient(env).send(
      new HeadObjectCommand({
        Bucket: env.bucketName,
        Key: key,
      }),
    )

    return true
  } catch (error) {
    const httpStatusCode =
      typeof error === "object" && error && "$metadata" in error
        ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
        : undefined
    const name = typeof error === "object" && error && "name" in error ? String((error as { name?: unknown }).name) : ""

    if (httpStatusCode === 404 || name === "NotFound" || name === "NoSuchKey") {
      return false
    }

    throw error
  }
}

export async function deleteBucketObject(env: StorageEnvironment, key: string): Promise<void> {
  await getStorageClient(env).send(
    new DeleteObjectCommand({
      Bucket: env.bucketName,
      Key: key,
    }),
  )
}

export async function createBucketObjectPresignedUrl(
  env: StorageEnvironment,
  key: string,
  options: { expiresInSeconds?: number } = {},
) {
  return getSignedUrl(
    getStorageClient(env),
    new GetObjectCommand({
      Bucket: env.bucketName,
      Key: key,
    }),
    {
      expiresIn: options.expiresInSeconds ?? 300,
    },
  )
}
