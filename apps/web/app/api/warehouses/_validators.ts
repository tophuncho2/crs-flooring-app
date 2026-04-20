import { WarehouseExecutionError } from "@builders/application"
import type { CreateWarehouseInput } from "@builders/application"

export function validateWarehouseInput(body: Record<string, unknown>): CreateWarehouseInput {
  const name = typeof body.name === "string" ? body.name.trim() : ""

  if (!name) {
    throw new WarehouseExecutionError({
      code: "WAREHOUSE_VALIDATION_FAILED",
      message: "name is required",
      status: 400,
      field: "name",
    })
  }

  const address = typeof body.address === "string" && body.address.trim() !== "" ? body.address : null
  const phone = typeof body.phone === "string" && body.phone.trim() !== "" ? body.phone : null

  return { name, address, phone }
}
