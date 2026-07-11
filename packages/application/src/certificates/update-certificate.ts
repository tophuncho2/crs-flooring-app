import { Prisma, updateCertificateRecord, withDatabaseTransaction } from "@builders/db"
import {
  CERTIFICATE_NAME_REQUIRED_MESSAGE,
  CERTIFICATE_NOT_FOUND_MESSAGE,
  isBlankName,
} from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2025 } from "../shared/prisma-errors.js"
import { CertificateExecutionError } from "./errors.js"
import type { CertificateUseCaseResult, UpdateCertificateUseCaseInput } from "./types.js"

export async function updateCertificateUseCase(
  id: string,
  input: UpdateCertificateUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<CertificateUseCaseResult> {
  assertActorEmail(actorEmail, "updateCertificateUseCase")

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
      if (isP2025(error)) {
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
