import {
  bucketObjectExists,
  buildBucketObjectUrl,
  createBucketObjectPresignedUrl,
  getBucketObject,
  type StorageEnvironment,
  uploadBucketObject,
} from "@builders/lib"
import { getStorageEnvironment } from "@/server/platform/env"

function getEnv(): StorageEnvironment {
  return getStorageEnvironment()
}

function getBucketName() {
  return getEnv().bucketName
}

export async function uploadFileToBucket(buffer: Buffer, fileName: string, contentType: string) {
  return uploadBucketObject(getEnv(), {
    data: buffer,
    key: `uploads/${fileName}`,
    contentType,
  })
}

export function buildBucketFileUrl(fileName: string) {
  return buildBucketObjectUrl(getEnv(), `uploads/${fileName}`)
}

export function buildBucketObjectUrlForKey(key: string) {
  return buildBucketObjectUrl(getEnv(), key)
}

export function createPresignedBucketObjectUrlForKey(key: string, options?: { expiresInSeconds?: number }) {
  return createBucketObjectPresignedUrl(getEnv(), key, options)
}

export function bucketObjectExistsForKey(key: string) {
  return bucketObjectExists(getEnv(), key)
}

export function isBucketFileUrl(url: string) {
  try {
    const parsedUrl = new URL(url)
    const storage = getEnv()
    const endpointUrl = new URL(storage.endpointUrl)

    return (
      parsedUrl.origin === endpointUrl.origin &&
      parsedUrl.pathname.startsWith(`/${storage.bucketName}/uploads/`)
    )
  } catch {
    return false
  }
}

export async function getFileFromBucket(fileName: string) {
  return getBucketObject(getEnv(), `uploads/${fileName}`)
}

// Fixed bucket key for the brand logo shown on the work-order print files. The
// bucket name varies per environment (AWS_S3_BUCKET_NAME), so staging/main read
// their own object under the same key.
const BRAND_LOGO_KEY = "assets/logo.png"

/**
 * Presigned GET URL for the print-file brand logo, or null when the object is
 * absent (callers fall back to brand text so prints never break). Kept private:
 * the bucket also holds sensitive uploads, so we sign rather than rely on public
 * read. The ~1h TTL outlives a print tab left open.
 */
export async function getBrandLogoPrintUrl(): Promise<string | null> {
  if (!(await bucketObjectExistsForKey(BRAND_LOGO_KEY))) {
    return null
  }
  return createPresignedBucketObjectUrlForKey(BRAND_LOGO_KEY, { expiresInSeconds: 3600 })
}
