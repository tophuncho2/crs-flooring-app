import {
  Prisma,
  deleteCertificateRecordById,
  listCertificateFileKeysByCertificateId,
  withDatabaseTransaction,
} from "@builders/db"
import { CERTIFICATE_NOT_FOUND_MESSAGE } from "@builders/domain"
import { deleteBucketObject, type StorageEnvironment } from "@builders/lib"
import { isP2025 } from "../shared/prisma-errors.js"
import { CertificateExecutionError } from "./errors.js"

// A certificate is now an aggregate root over its files. The FK cascade removes
// child ROWS on delete, but cannot reach the bucket — so we capture the child
// object keys inside the tx (before the cascade), then best-effort delete the S3
// OBJECTS after the rows commit. Orphaned objects (if cleanup fails) are
// sweepable; the DB is already consistent.
export async function deleteCertificateUseCase(
  id: string,
  storage: StorageEnvironment,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  const objectKeys = await withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const keys = await listCertificateFileKeysByCertificateId(id, c)

    try {
      await deleteCertificateRecordById(id, c)
    } catch (error) {
      if (isP2025(error)) {
        throw new CertificateExecutionError({
          code: "CERTIFICATE_NOT_FOUND",
          message: CERTIFICATE_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }

    return keys
  })

  await Promise.all(objectKeys.map((key) => deleteBucketObject(storage, key).catch(() => {})))
  return { ok: true }
}
