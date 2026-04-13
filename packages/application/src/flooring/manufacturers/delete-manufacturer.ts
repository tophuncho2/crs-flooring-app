import { getManufacturerDeleteState, deleteManufacturerRecordById } from "@builders/db"
import { isManufacturerDeleteBlocked } from "@builders/domain"
import { ManufacturerExecutionError } from "./errors.js"

export async function deleteManufacturerRecord(id: string): Promise<{ ok: true }> {
  const manufacturer = await getManufacturerDeleteState(id)

  if (!manufacturer) {
    throw new ManufacturerExecutionError({
      code: "MANUFACTURER_NOT_FOUND",
      message: "Manufacturer not found",
      status: 404,
    })
  }

  if (isManufacturerDeleteBlocked(manufacturer._count.products)) {
    throw new ManufacturerExecutionError({
      code: "MANUFACTURER_IN_USE",
      message: "This manufacturer has linked products and cannot be deleted",
      status: 409,
    })
  }

  await deleteManufacturerRecordById(id)

  return { ok: true }
}
