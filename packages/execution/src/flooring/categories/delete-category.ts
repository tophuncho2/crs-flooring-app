import { deleteCategoryRecord, getCategoryDeleteState } from "@builders/db"
import { getCategoryDeleteBlockedMessage, isCategoryDeleteBlocked } from "@builders/domain"
import { CategoryExecutionError } from "./errors.js"

export async function deleteCategoryUseCase(id: string): Promise<{ ok: true }> {
  const linkState = await getCategoryDeleteState(id)

  if (!linkState) {
    throw new CategoryExecutionError({
      code: "CATEGORY_NOT_FOUND",
      message: "Category not found",
      status: 404,
    })
  }

  if (isCategoryDeleteBlocked(linkState)) {
    throw new CategoryExecutionError({
      code: "CATEGORY_IN_USE",
      message: getCategoryDeleteBlockedMessage(linkState),
      status: 409,
    })
  }

  await deleteCategoryRecord(id)

  return { ok: true }
}
