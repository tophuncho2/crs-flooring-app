import {
  Prisma,
  createWarehouse,
  getExistingWarehouseNumbers,
  warehouseNameExists,
  withDatabaseTransaction,
} from "@builders/db"
import { computeNextNumber } from "@builders/domain"
import { isP2002 } from "../../shared/prisma-errors.js"
import { WarehouseExecutionError } from "./errors.js"
import type { CreateWarehouseInput, WarehouseResult } from "./types.js"

export async function createWarehouseUseCase(
  input: CreateWarehouseInput,
  client?: Prisma.TransactionClient,
): Promise<WarehouseResult> {
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

    for (let attempt = 0; attempt < 2; attempt++) {
      const existing = await getExistingWarehouseNumbers(c)
      const number = computeNextNumber(existing)
      try {
        return await createWarehouse(
          {
            number,
            name: input.name,
            address: input.address,
            phone: input.phone,
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
        if (isP2002(error, "number") && attempt === 0) continue
        if (isP2002(error, "number")) {
          throw new WarehouseExecutionError({
            code: "WAREHOUSE_NUMBER_CONFLICT",
            message: "Warehouse number assignment lost a race; retry the request",
            status: 409,
          })
        }
        throw error
      }
    }

    throw new WarehouseExecutionError({
      code: "WAREHOUSE_NUMBER_CONFLICT",
      message: "Warehouse number assignment lost a race; retry the request",
      status: 409,
    })
  })
}
