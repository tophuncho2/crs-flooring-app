import type { Prisma } from "@builders/db"
import { getCertificateFileById } from "@builders/db"
import { CERTIFICATE_FILE_NOT_FOUND_MESSAGE } from "@builders/domain"
import { createBucketObjectPresignedUrl, type StorageEnvironment } from "@builders/lib"
import { CertificateExecutionError } from "./errors.js"

export type CreateCertificateFileDownloadUrlInput = {
  certificateId: string
  fileId: string
  /** Injected by the route from `getStorageEnvironment()`. */
  storage: StorageEnvironment
  expiresInSeconds?: number
}

/**
 * Mint a short-lived presigned GET URL for a certificate file. The bucket is
 * private, so every download is signed — never a public-read URL. Read-only.
 */
export async function createCertificateFileDownloadUrlUseCase(
  input: CreateCertificateFileDownloadUrlInput,
  client?: Prisma.TransactionClient,
): Promise<{ url: string }> {
  const file = await getCertificateFileById(input.fileId, client)
  if (!file || file.certificateId !== input.certificateId) {
    throw new CertificateExecutionError({
      code: "CERTIFICATE_FILE_NOT_FOUND",
      message: CERTIFICATE_FILE_NOT_FOUND_MESSAGE,
      status: 404,
    })
  }

  const url = await createBucketObjectPresignedUrl(input.storage, file.objectKey, {
    expiresInSeconds: input.expiresInSeconds,
  })
  return { url }
}
