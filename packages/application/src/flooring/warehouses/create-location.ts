import {
  Prisma,
  createLocation,
  getSectionById,
  locationCoordExists,
  withDatabaseTransaction,
} from "@builders/db"
import { doesSectionBelongToWarehouse, isValidRafterLevel } from "@builders/domain"
import { isP2002 } from "../../shared/prisma-errors.js"
import { WarehouseExecutionError } from "./errors.js"
import { toLocationResult, type LocationResult } from "./mappers.js"
import type { CreateLocationInput } from "./types.js"

export async function createLocationUseCase(
  warehouseId: string,
  input: CreateLocationInput,
  client?: Prisma.TransactionClient,
): Promise<LocationResult> {
  if (!isValidRafterLevel(input.rafter)) {
    throw new WarehouseExecutionError({
      code: "LOCATION_VALIDATION_FAILED",
      message: "Rafter must be an integer between 1 and 99",
      status: 400,
      field: "rafter",
    })
  }
  if (!isValidRafterLevel(input.level)) {
    throw new WarehouseExecutionError({
      code: "LOCATION_VALIDATION_FAILED",
      message: "Level must be an integer between 1 and 99",
      status: 400,
      field: "level",
    })
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const section = await getSectionById(input.sectionId, c)
    if (!section) {
      throw new WarehouseExecutionError({
        code: "SECTION_NOT_FOUND",
        message: "Section not found",
        status: 404,
      })
    }
    if (!doesSectionBelongToWarehouse(section, warehouseId)) {
      throw new WarehouseExecutionError({
        code: "SECTION_BELONGS_TO_DIFFERENT_WAREHOUSE",
        message: "Section does not belong to the given warehouse",
        status: 400,
      })
    }

    if (await locationCoordExists(warehouseId, input.rafter, input.level, { client: c })) {
      throw new WarehouseExecutionError({
        code: "LOCATION_COORD_CONFLICT",
        message: "Another location already occupies this rafter/level coordinate in this warehouse",
        status: 409,
        payload: { rafter: input.rafter, level: input.level },
      })
    }

    try {
      const record = await createLocation(
        {
          warehouseId,
          sectionId: input.sectionId,
          rafter: input.rafter,
          level: input.level,
        },
        c,
      )
      return toLocationResult(record)
    } catch (error) {
      if (isP2002(error, "rafter") || isP2002(error, "level") || isP2002(error, "warehouseId")) {
        throw new WarehouseExecutionError({
          code: "LOCATION_COORD_CONFLICT",
          message: "Another location already occupies this rafter/level coordinate in this warehouse",
          status: 409,
          payload: { rafter: input.rafter, level: input.level },
        })
      }
      throw error
    }
  })
}
