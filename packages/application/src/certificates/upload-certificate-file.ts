import { randomUUID } from "node:crypto"
import {
  Prisma,
  createCertificateFileRow,
  getCertificateById,
  withDatabaseTransaction,
} from "@builders/db"
import {
  CERTIFICATE_FILE_REQUIRED_MESSAGE,
  CERTIFICATE_FILE_TOO_LARGE_MESSAGE,
  CERTIFICATE_FILE_TYPE_NOT_ALLOWED_MESSAGE,
  CERTIFICATE_NOT_FOUND_MESSAGE,
  buildCertificateFileObjectKey,
  isAllowedCertificateFileContentType,
  isAllowedCertificateFileSize,
  type CertificateFileRecord,
} from "@builders/domain"
import { deleteBucketObject, uploadBucketObject, type StorageEnvironment } from "@builders/lib"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2025 } from "../shared/prisma-errors.js"
import { CertificateExecutionError } from "./errors.js"

export type UploadCertificateFileInput = {
  certificateId: string
  fileName: string
  contentType: string
  data: Buffer
  /** Injected by the route from `getStorageEnvironment()` — keeps env at the edge. */
  storage: StorageEnvironment
}

/**
 * Attach a file to a certificate: validate → verify parent exists → PUT the bytes
 * to S3 → INSERT the row. The object is written before the row so the row never
 * points at a missing object; if the insert then fails, a compensating delete
 * removes the just-uploaded object so S3 keeps no orphan the DB doesn't know
 * about. Does NOT touch the parent's `updatedAt` (files are an independent
 * collection, decoupled from the primary-section OCC token).
 */
export async function uploadCertificateFileUseCase(
  input: UploadCertificateFileInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<CertificateFileRecord> {
  assertActorEmail(actorEmail, "uploadCertificateFileUseCase")

  if (!input.data || input.data.byteLength === 0) {
    throw new CertificateExecutionError({
      code: "CERTIFICATE_FILE_VALIDATION_FAILED",
      message: CERTIFICATE_FILE_REQUIRED_MESSAGE,
      status: 400,
      field: "file",
    })
  }
  if (!isAllowedCertificateFileContentType(input.contentType)) {
    throw new CertificateExecutionError({
      code: "CERTIFICATE_FILE_VALIDATION_FAILED",
      message: CERTIFICATE_FILE_TYPE_NOT_ALLOWED_MESSAGE,
      status: 400,
      field: "file",
    })
  }
  if (!isAllowedCertificateFileSize(input.data.byteLength)) {
    throw new CertificateExecutionError({
      code: "CERTIFICATE_FILE_VALIDATION_FAILED",
      message: CERTIFICATE_FILE_TOO_LARGE_MESSAGE,
      status: 400,
      field: "file",
    })
  }

  // Verify the parent up-front → a clean 404 rather than a raw FK violation on
  // insert. Read outside the write tx so we never hold a row lock while pushing
  // bytes to S3.
  try {
    await getCertificateById(input.certificateId, client)
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

  const fileId = randomUUID()
  const objectKey = buildCertificateFileObjectKey({
    certificateId: input.certificateId,
    fileId,
    fileName: input.fileName,
  })

  await uploadBucketObject(input.storage, {
    data: input.data,
    key: objectKey,
    contentType: input.contentType,
  })

  try {
    return await withDatabaseTransaction(async (tx) => {
      const c = client ?? tx
      return createCertificateFileRow(
        {
          id: fileId,
          certificateId: input.certificateId,
          objectKey,
          fileName: input.fileName,
          contentType: input.contentType,
          sizeBytes: input.data.byteLength,
          createdBy: actorEmail,
        },
        c,
      )
    })
  } catch (error) {
    // Compensate: the row didn't land, so drop the orphaned object.
    await deleteBucketObject(input.storage, objectKey).catch(() => {})
    throw error
  }
}
