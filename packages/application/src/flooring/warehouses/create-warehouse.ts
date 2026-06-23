import {
  Prisma,
  createWarehouse,
  warehouseNameExists,
  withDatabaseTransaction,
} from "@builders/db"
import { isP2002 } from "../../shared/prisma-errors.js"
import { WarehouseExecutionError } from "./errors.js"
import type { CreateWarehouseInput, WarehouseResult } from "./types.js"

export async function createWarehouseUseCase(
  input: CreateWarehouseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<WarehouseResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("createWarehouseUseCase requires a non-empty actorEmail")
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (await warehouseNameExists(input.name, { client: c })) {
      throw new WarehouseExecutionError({
        code: "WAREHOUSE_NAME_CONFLICT",
        message: "Warehouse name must be unique",
        status: 409,
        field: "name",
      })
    }

    try {
      return await createWarehouse(
        {
          name: input.name,
          streetAddress: input.streetAddress,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          phone: input.phone,
          createdBy: actorEmail,
          updatedBy: actorEmail,
        },
        c,
      )
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
