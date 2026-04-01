import {
  deleteUnitOfMeasureRecord,
  getUnitOfMeasureDeleteState,
} from "@builders/db"
import {
  getUnitOfMeasureDeleteBlockedMessage,
  isUnitOfMeasureDeleteBlocked,
} from "@builders/domain"
import { UnitOfMeasureExecutionError } from "./errors.js"

export async function deleteUnitOfMeasureUseCase(id: string): Promise<{ ok: true }> {
  const deleteState = await getUnitOfMeasureDeleteState(id)

  if (!deleteState) {
    throw new UnitOfMeasureExecutionError({
      code: "UOM_NOT_FOUND",
      message: "Unit of measure not found",
      status: 404,
    })
  }

  const categoryLinks =
    deleteState._count.sendUnitCategories +
    deleteState._count.stockUnitCategories +
    deleteState._count.coverageAvailableUnitCategories +
    deleteState._count.itemCoverageUnitCategories +
    deleteState._count.serviceUnitCategories

  const serviceLinks =
    deleteState._count.services +
    deleteState._count.templateServiceItems +
    deleteState._count.workOrderServiceItems

  const linkState = { categoryLinks, serviceLinks }

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
