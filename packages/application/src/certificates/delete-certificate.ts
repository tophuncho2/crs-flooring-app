import { Prisma, deleteCertificateRecordById, withDatabaseTransaction } from "@builders/db"
import { CERTIFICATE_NOT_FOUND_MESSAGE } from "@builders/domain"
import { CertificateExecutionError } from "./errors.js"

// No in-use guard: certificates own no children and nothing references them, so
// the delete is unconditional.
export async function deleteCertificateUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    try {
      await deleteCertificateRecordById(id, c)
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

    return { ok: true }
  })
}
