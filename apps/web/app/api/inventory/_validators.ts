import { z } from "zod"
import { InventoryExecutionError } from "@builders/application"
import type { InventoryListFilters, UpdateInventoryInput } from "@builders/application"
import type { ListInput } from "@builders/application"
import {
  LIST_INVENTORY_MAX_PAGE_SIZE,
  LIST_INVENTORY_PAGE_SIZE,
} from "@builders/domain"

function optionalString(value: unknown, field: string): string {
  if (value === undefined || value === null) return ""
  if (typeof value !== "string") {
    throw new InventoryExecutionError({
      code: "INVENTORY_VALIDATION_FAILED",
      message: `${field} must be a string`,
      status: 400,
      field,
    })
  }
  return value
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new InventoryExecutionError({
      code: "INVENTORY_VALIDATION_FAILED",
      message: `${field} must be true or false`,
      status: 400,
      field,
    })
  }
  return value
}

// --- Picker / options search validator ---

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

const inventorySearchQuerySchema = z.object({
  warehouseId: z.string().min(1, "warehouseId is required"),
  productId: z.string().optional(),
  location: z.string().optional(),
  search: z.string().optional(),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(OPTIONS_MAX_TAKE)
    .default(OPTIONS_DEFAULT_TAKE),
})

export type ValidatedInventorySearchQuery = {
  warehouseId: string
  productId?: string
  location?: string
  search?: string
  take: number
}

export function validateInventorySearchQuery(
  searchParams: URLSearchParams,
): ValidatedInventorySearchQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = inventorySearchQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new InventoryExecutionError({
      code: "INVENTORY_VALIDATION_FAILED",
      message: issue?.message ?? "Invalid inventory options query",
      status: 400,
      ...(issue?.path[0] ? { field: String(issue.path[0]) } : {}),
    })
  }

  const parsed = parseResult.data
  const trimSearch = parsed.search?.trim()
  const trimProduct = parsed.productId?.trim()
  const trimLocation = parsed.location?.trim()
  return {
    warehouseId: parsed.warehouseId.trim(),
    ...(trimProduct ? { productId: trimProduct } : {}),
    ...(trimLocation ? { location: trimLocation } : {}),
    ...(trimSearch ? { search: trimSearch } : {}),
    take: parsed.take,
  }
}

// --- List view query validator (search + filters + pagination) ---

const ID_FILTER_KEYS = ["warehouseId", "categoryId", "productId"] as const
type IdFilterKey = (typeof ID_FILTER_KEYS)[number]

const listInventoryQuerySchema = z.object({
  q: z.string().optional(),
  location: z.string().optional(),
  archived: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_INVENTORY_MAX_PAGE_SIZE)
    .default(LIST_INVENTORY_PAGE_SIZE),
})

function readMultiValue(searchParams: URLSearchParams, key: string): string[] {
  return Array.from(
    new Set(
      searchParams
        .getAll(key)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  )
}

export function validateListInventoryQuery(
  searchParams: URLSearchParams,
): ListInput<InventoryListFilters> {
  // Strip multi-value ID filter keys before zod validation — zod sees only scalar params.
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if ((ID_FILTER_KEYS as readonly string[]).includes(key)) return
    raw[key] = value
  })

  const parseResult = listInventoryQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new InventoryExecutionError({
      code: "INVENTORY_VALIDATION_FAILED",
      message: issue?.message ?? "Invalid inventory list query",
      status: 400,
      ...(issue?.path[0] ? { field: String(issue.path[0]) } : {}),
    })
  }

  const parsed = parseResult.data
  const trimmedSearch = parsed.q?.trim()
  const search = trimmedSearch ? trimmedSearch : undefined
  const trimmedLocation = parsed.location?.trim()
  const location = trimmedLocation && trimmedLocation.length > 0 ? trimmedLocation : undefined
  const archived =
    parsed.archived === "true" ? true : parsed.archived === "false" ? false : undefined

  const idFilterEntries: Array<[IdFilterKey, string[]]> = ID_FILTER_KEYS.map((key) => [
    key,
    readMultiValue(searchParams, key),
  ])
  const filterRecord: Partial<InventoryListFilters> = {}
  for (const [key, values] of idFilterEntries) {
    if (values.length > 0) filterRecord[key] = values
  }
  if (location) filterRecord.location = location
  if (archived !== undefined) filterRecord.isArchived = archived

  const hasAnyFilter = Object.keys(filterRecord).length > 0

  return {
    search,
    filters: hasAnyFilter ? (filterRecord as InventoryListFilters) : undefined,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}

export function validateUpdateInventoryInput(body: Record<string, unknown>): UpdateInventoryInput {
  // `inventoryItem` is server-recomputed (composeInventoryItem) inside the
  // update use case; never accepted from the client.
  const input: UpdateInventoryInput = {}
  if (body.rollNumber !== undefined) input.rollNumber = optionalString(body.rollNumber, "rollNumber")
  if (body.dyeLot !== undefined) input.dyeLot = optionalString(body.dyeLot, "dyeLot")
  if (body.warehouseId !== undefined) input.warehouseId = optionalString(body.warehouseId, "warehouseId")
  if (body.location !== undefined) input.location = optionalString(body.location, "location")
  if (body.note !== undefined) input.note = optionalString(body.note, "note")
  if (body.internalNotes !== undefined) input.internalNotes = optionalString(body.internalNotes, "internalNotes")
  if (body.isArchived !== undefined) input.isArchived = requireBoolean(body.isArchived, "isArchived")
  return input
}
