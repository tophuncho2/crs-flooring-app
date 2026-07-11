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
  normalizePhoneNumber,
} from "@builders/domain"
import { optionsQuerySchema, parseQuery } from "@/app/api/_shared/validators"

function fail(message: string, field?: string): never {
  throw new WarehouseExecutionError({
    code: "WAREHOUSE_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

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
  // Phone standard (lenient): normalize to canonical digits, never reject.
  const phoneRaw = typeof body.phone === "string" ? body.phone.trim() : ""
  const phone = phoneRaw ? normalizePhoneNumber(phoneRaw) || null : null

  return { name, streetAddress, city, state, postalCode, phone }
}

// --- List query validator ---

const listWarehousesQuerySchema = z.object({
  q: z.string().optional(),
  storeNumber: z.string().optional(),
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
  const parsed = parseQuery(searchParams, listWarehousesQuerySchema, fail, "Invalid warehouses list query")

  const trimmedSearch = parsed.q?.trim()
  const search = trimmedSearch ? trimmedSearch : undefined
  const trimmedStoreNumber = parsed.storeNumber?.trim()
  const storeNumber = trimmedStoreNumber ? trimmedStoreNumber : undefined

  return {
    search,
    filters: { storeNumber },
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}

// --- Options query validator ---

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

const warehouseOptionsQuerySchema = optionsQuerySchema({
  takeMax: OPTIONS_MAX_TAKE,
  takeDefault: OPTIONS_DEFAULT_TAKE,
})

export type ValidatedWarehouseOptionsQuery = {
  search?: string
  skip: number
  take: number
}

export function validateWarehouseOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedWarehouseOptionsQuery {
  const parsed = parseQuery(searchParams, warehouseOptionsQuerySchema, fail, "Invalid warehouse options query")
  const trimmed = parsed.search?.trim()
  return {
    search: trimmed ? trimmed : undefined,
    skip: parsed.skip,
    take: parsed.take,
  }
}
