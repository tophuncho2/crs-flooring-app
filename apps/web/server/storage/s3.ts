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

// Presigned-URL lifetime, and how long we reuse a minted URL within one process.
// The TTL sits comfortably under the expiry so a cached URL never nears expiring
// mid-use. A null result (logo not yet uploaded) is cached only briefly so a
// fresh upload surfaces without a restart.
const BRAND_LOGO_PRESIGN_SECONDS = 3600
const BRAND_LOGO_URL_TTL_MS = 50 * 60 * 1000
const BRAND_LOGO_MISS_TTL_MS = 60 * 1000

// Per-process memo of the presigned brand-logo URL. This is an ephemeral,
// derived cache — NOT shared/session state — so the app stays stateless and
// horizontally scalable: each replica lazily rebuilds its own. It removes the
// per-print HEAD + presign round trip, and (because the memoized URL is stable
// within its window) lets the browser cache the logo bytes across prints instead
// of re-fetching a fresh signed URL every time.
let brandLogoMemo: { value: string | null; expiresAt: number } | null = null

/**
 * Presigned GET URL for the print-file brand logo, or null when the object is
 * absent (callers fall back to brand text so prints never break). Kept private:
 * the bucket also holds sensitive uploads, so we sign rather than rely on public
 * read. Memoized per process (see {@link brandLogoMemo}).
 */
export async function getBrandLogoPrintUrl(): Promise<string | null> {
  const now = Date.now()
  if (brandLogoMemo && now < brandLogoMemo.expiresAt) {
    return brandLogoMemo.value
  }

  const value = (await bucketObjectExistsForKey(BRAND_LOGO_KEY))
    ? await createPresignedBucketObjectUrlForKey(BRAND_LOGO_KEY, {
        expiresInSeconds: BRAND_LOGO_PRESIGN_SECONDS,
      })
    : null

  brandLogoMemo = {
    value,
    expiresAt: now + (value ? BRAND_LOGO_URL_TTL_MS : BRAND_LOGO_MISS_TTL_MS),
  }
  return value
}
