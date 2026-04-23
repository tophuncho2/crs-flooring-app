import { Prisma, deleteTemplateMaterialItemRecordById, withDatabaseTransaction } from "@builders/db"
import { TEMPLATE_MATERIAL_ITEM_NOT_FOUND_MESSAGE } from "@builders/domain"
import { TemplateMaterialItemExecutionError } from "./errors.js"
import type { DeleteTemplateMaterialItemUseCaseInput } from "./types.js"

export async function deleteTemplateMaterialItemUseCase(
  input: DeleteTemplateMaterialItemUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    try {
      await deleteTemplateMaterialItemRecordById(input.id, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new TemplateMaterialItemExecutionError({
          code: "TEMPLATE_MATERIAL_ITEM_NOT_FOUND",
          message: TEMPLATE_MATERIAL_ITEM_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }

    return { ok: true }
  })
}
