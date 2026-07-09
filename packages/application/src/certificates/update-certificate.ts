import { Prisma, updateCertificateRecord, withDatabaseTransaction } from "@builders/db"
import {
  CERTIFICATE_NAME_REQUIRED_MESSAGE,
  CERTIFICATE_NOT_FOUND_MESSAGE,
  isBlankName,
} from "@builders/domain"
import { CertificateExecutionError } from "./errors.js"
import type { CertificateUseCaseResult, UpdateCertificateUseCaseInput } from "./types.js"

export async function updateCertificateUseCase(
  id: string,
  input: UpdateCertificateUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<CertificateUseCaseResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("updateCertificateUseCase requires a non-empty actorEmail")
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (input.name !== undefined && isBlankName(input.name)) {
      throw new CertificateExecutionError({
        code: "CERTIFICATE_VALIDATION_FAILED",
        message: CERTIFICATE_NAME_REQUIRED_MESSAGE,
        status: 400,
        field: "name",
      })
    }

    try {
      return await updateCertificateRecord(id, { ...input, updatedBy: actorEmail }, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new CertificateExecutionError({
          code: "CERTIFICATE_NOT_FOUND",
          message: CERTIFICATE_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }
  })
}
