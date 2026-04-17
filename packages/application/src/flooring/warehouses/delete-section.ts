import {
  Prisma,
  deleteSectionById,
  getSectionDeleteState,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildSectionDeleteBlockedMessage,
  isSectionDeleteBlocked,
} from "@builders/domain"
import { WarehouseExecutionError } from "./errors.js"

export async function deleteSectionUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const counts = await getSectionDeleteState(id, c)
    if (!counts) {
      throw new WarehouseExecutionError({
        code: "SECTION_NOT_FOUND",
        message: "Section not found",
        status: 404,
      })
    }

    if (isSectionDeleteBlocked(counts)) {
      throw new WarehouseExecutionError({
        code: "SECTION_IN_USE",
        message: buildSectionDeleteBlockedMessage(counts),
        status: 409,
      })
    }

    await deleteSectionById(id, c)

    return { ok: true }
  })
}
