import { Prisma, deleteTemplateRecordById, withDatabaseTransaction } from "@builders/db"
import { TEMPLATE_NOT_FOUND_MESSAGE } from "@builders/domain"
import { TemplateExecutionError } from "./errors.js"

export async function deleteTemplateUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    try {
      await deleteTemplateRecordById(id, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new TemplateExecutionError({
          code: "TEMPLATE_NOT_FOUND",
          message: TEMPLATE_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }

    return { ok: true }
  })
}
