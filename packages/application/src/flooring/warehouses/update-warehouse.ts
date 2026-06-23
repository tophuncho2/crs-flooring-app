import {
  Prisma,
  getWarehouseById,
  updateWarehouse,
  warehouseNameExists,
  withDatabaseTransaction,
} from "@builders/db"
import { isP2002 } from "../../shared/prisma-errors.js"
import { WarehouseExecutionError } from "./errors.js"
import type { UpdateWarehouseInput, WarehouseResult } from "./types.js"

export async function updateWarehouseUseCase(
  id: string,
  input: UpdateWarehouseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<WarehouseResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("updateWarehouseUseCase requires a non-empty actorEmail")
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const current = await getWarehouseById(id, c)
    if (!current) {
      throw new WarehouseExecutionError({
        code: "WAREHOUSE_NOT_FOUND",
        message: "Warehouse not found",
        status: 404,
      })
    }

    if (input.name !== undefined) {
      if (await warehouseNameExists(input.name, { excludeId: id, client: c })) {
        throw new WarehouseExecutionError({
          code: "WAREHOUSE_NAME_CONFLICT",
          message: "Warehouse name must be unique",
          status: 409,
          field: "name",
        })
      }
    }

    try {
      return await updateWarehouse(id, { ...input, updatedBy: actorEmail }, c)
    } catch (error) {
      if (isP2002(error, "name")) {
        throw new WarehouseExecutionError({
          code: "WAREHOUSE_NAME_CONFLICT",
          message: "Warehouse name must be unique",
          status: 409,
          field: "name",
        })
      }
      throw error
    }
  })
}
