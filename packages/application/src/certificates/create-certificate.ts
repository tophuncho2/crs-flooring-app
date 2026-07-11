import { Prisma, createCertificateRecord, withDatabaseTransaction } from "@builders/db"
import { CERTIFICATE_NAME_REQUIRED_MESSAGE, isBlankName } from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { CertificateExecutionError } from "./errors.js"
import type { CertificateUseCaseResult, CreateCertificateUseCaseInput } from "./types.js"

export async function createCertificateUseCase(
  input: CreateCertificateUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<CertificateUseCaseResult> {
  assertActorEmail(actorEmail, "createCertificateUseCase")

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (isBlankName(input.name)) {
      throw new CertificateExecutionError({
        code: "CERTIFICATE_VALIDATION_FAILED",
        message: CERTIFICATE_NAME_REQUIRED_MESSAGE,
        status: 400,
        field: "name",
      })
    }

    return createCertificateRecord(
      { ...input, createdBy: actorEmail, updatedBy: actorEmail },
      c,
    )
  })
}
