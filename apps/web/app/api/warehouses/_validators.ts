import { z } from "zod"
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

// --- Options query validator ---

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

const warehouseOptionsQuerySchema = z.object({
  search: z.string().optional(),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(OPTIONS_MAX_TAKE)
    .default(OPTIONS_DEFAULT_TAKE),
})

export type ValidatedWarehouseOptionsQuery = {
  search?: string
  take: number
}

export function validateWarehouseOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedWarehouseOptionsQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = warehouseOptionsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new WarehouseExecutionError({
      code: "WAREHOUSE_VALIDATION_FAILED",
      message: issue?.message ?? "Invalid warehouse options query",
      status: 400,
      ...(issue?.path[0] ? { field: String(issue.path[0]) } : {}),
    })
  }

  const parsed = parseResult.data
  const trimmed = parsed.search?.trim()
  return {
    search: trimmed ? trimmed : undefined,
    take: parsed.take,
  }
}
