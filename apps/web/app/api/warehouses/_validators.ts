import { z } from "zod"
import { WarehouseExecutionError } from "@builders/application"
import type {
  CreateWarehouseInput,
  ListInput,
  WarehousesListFilters,
} from "@builders/application"
import {
  LIST_WAREHOUSES_MAX_PAGE_SIZE,
  LIST_WAREHOUSES_PAGE_SIZE,
} from "@builders/domain"

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

  const streetAddress =
    typeof body.streetAddress === "string" && body.streetAddress.trim() !== "" ? body.streetAddress : null
  const city = typeof body.city === "string" && body.city.trim() !== "" ? body.city : null
  const state = typeof body.state === "string" && body.state.trim() !== "" ? body.state : null
  const postalCode =
    typeof body.postalCode === "string" && body.postalCode.trim() !== "" ? body.postalCode : null
  const phone = typeof body.phone === "string" && body.phone.trim() !== "" ? body.phone : null

  return { name, streetAddress, city, state, postalCode, phone }
}

// --- List query validator ---

const listWarehousesQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_WAREHOUSES_MAX_PAGE_SIZE)
    .default(LIST_WAREHOUSES_PAGE_SIZE),
})

export function validateListWarehousesQuery(
  searchParams: URLSearchParams,
): ListInput<WarehousesListFilters> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = listWarehousesQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new WarehouseExecutionError({
      code: "WAREHOUSE_VALIDATION_FAILED",
      message: issue?.message ?? "Invalid warehouses list query",
      status: 400,
      ...(issue?.path[0] ? { field: String(issue.path[0]) } : {}),
    })
  }

  const parsed = parseResult.data
  const trimmedSearch = parsed.q?.trim()
  const search = trimmedSearch ? trimmedSearch : undefined

  return {
    search,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
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
