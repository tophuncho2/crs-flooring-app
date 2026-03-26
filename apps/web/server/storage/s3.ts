import {
  buildBucketObjectUrl,
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
