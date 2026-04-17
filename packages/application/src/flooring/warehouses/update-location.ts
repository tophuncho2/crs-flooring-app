import {
  Prisma,
  getLocationById,
  getSectionById,
  locationCoordExists,
  updateLocation,
  withDatabaseTransaction,
} from "@builders/db"
import { doesSectionBelongToWarehouse, isValidRafterLevel } from "@builders/domain"
import { isP2002 } from "../../shared/prisma-errors.js"
import { WarehouseExecutionError } from "./errors.js"
import { toLocationResult, type LocationResult } from "./mappers.js"
import type { UpdateLocationInput } from "./types.js"

export async function updateLocationUseCase(
  id: string,
  input: UpdateLocationInput,
  client?: Prisma.TransactionClient,
): Promise<LocationResult> {
  if (input.rafter !== undefined && !isValidRafterLevel(input.rafter)) {
    throw new WarehouseExecutionError({
      code: "LOCATION_VALIDATION_FAILED",
      message: "Rafter must be an integer between 1 and 99",
      status: 400,
      field: "rafter",
    })
  }
  if (input.level !== undefined && !isValidRafterLevel(input.level)) {
    throw new WarehouseExecutionError({
      code: "LOCATION_VALIDATION_FAILED",
      message: "Level must be an integer between 1 and 99",
      status: 400,
      field: "level",
    })
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const current = await getLocationById(id, c)
    if (!current) {
      throw new WarehouseExecutionError({
        code: "LOCATION_NOT_FOUND",
        message: "Location not found",
        status: 404,
      })
    }

    if (input.sectionId !== undefined) {
      const section = await getSectionById(input.sectionId, c)
      if (!section) {
        throw new WarehouseExecutionError({
          code: "SECTION_NOT_FOUND",
          message: "Section not found",
          status: 404,
        })
      }
      if (!doesSectionBelongToWarehouse(section, current.warehouseId)) {
        throw new WarehouseExecutionError({
          code: "SECTION_BELONGS_TO_DIFFERENT_WAREHOUSE",
          message: "Section does not belong to the location's warehouse",
          status: 400,
        })
      }
    }

    const coordChanging = input.rafter !== undefined || input.level !== undefined
    if (coordChanging) {
      const effectiveRafter = input.rafter ?? current.rafter
      const effectiveLevel = input.level ?? current.level
      if (
        await locationCoordExists(current.warehouseId, effectiveRafter, effectiveLevel, {
          excludeId: id,
          client: c,
        })
      ) {
        throw new WarehouseExecutionError({
          code: "LOCATION_COORD_CONFLICT",
          message: "Another location already occupies this rafter/level coordinate in this warehouse",
          status: 409,
          payload: { rafter: effectiveRafter, level: effectiveLevel },
        })
      }
    }

    try {
      const record = await updateLocation(id, input, c)
      return toLocationResult(record)
    } catch (error) {
      if (isP2002(error, "rafter") || isP2002(error, "level") || isP2002(error, "warehouseId")) {
        throw new WarehouseExecutionError({
          code: "LOCATION_COORD_CONFLICT",
          message: "Another location already occupies this rafter/level coordinate in this warehouse",
          status: 409,
          payload: {
            rafter: input.rafter ?? current.rafter,
            level: input.level ?? current.level,
          },
        })
      }
      throw error
    }
  })
}
