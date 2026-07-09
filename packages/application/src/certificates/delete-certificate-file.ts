import {
  Prisma,
  deleteCertificateFileRow,
  getCertificateFileById,
  withDatabaseTransaction,
} from "@builders/db"
import { CERTIFICATE_FILE_NOT_FOUND_MESSAGE } from "@builders/domain"
import { deleteBucketObject, type StorageEnvironment } from "@builders/lib"
import { CertificateExecutionError } from "./errors.js"

export type DeleteCertificateFileInput = {
  certificateId: string
  fileId: string
  /** Injected by the route from `getStorageEnvironment()`. */
  storage: StorageEnvironment
}

/**
 * Detach a file: delete the row (scoped to its parent), then best-effort delete
 * the S3 object AFTER the row commits. A failed object delete orphans the object
 * (sweepable) but never leaves a row pointing at a missing object.
 */
export async function deleteCertificateFileUseCase(
  input: DeleteCertificateFileInput,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  const objectKey = await withDatabaseTransaction(async (tx) => {
    const c = client ?? tx
    const file = await getCertificateFileById(input.fileId, c)
    if (!file || file.certificateId !== input.certificateId) {
      throw new CertificateExecutionError({
        code: "CERTIFICATE_FILE_NOT_FOUND",
        message: CERTIFICATE_FILE_NOT_FOUND_MESSAGE,
        status: 404,
      })
    }
    await deleteCertificateFileRow(input.fileId, c)
    return file.objectKey
  })

  await deleteBucketObject(input.storage, objectKey).catch(() => {})
  return { ok: true }
}
