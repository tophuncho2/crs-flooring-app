import { deleteUnitOfMeasureRecord, getUnitOfMeasureDeleteState } from "@builders/db"
import { getUnitOfMeasureDeleteBlockedMessage, isUnitOfMeasureDeleteBlocked } from "@builders/domain"
import { UnitOfMeasureExecutionError } from "./errors.js"

export async function deleteUnitOfMeasureUseCase(id: string): Promise<{ ok: true }> {
  const linkState = await getUnitOfMeasureDeleteState(id)

  if (!linkState) {
    throw new UnitOfMeasureExecutionError({
      code: "UOM_NOT_FOUND",
      message: "Unit of measure not found",
      status: 404,
    })
  }

  if (isUnitOfMeasureDeleteBlocked(linkState)) {
    throw new UnitOfMeasureExecutionError({
      code: "UOM_IN_USE",
      message: getUnitOfMeasureDeleteBlockedMessage(linkState),
      status: 409,
    })
  }

  await deleteUnitOfMeasureRecord(id)

  return { ok: true }
}
