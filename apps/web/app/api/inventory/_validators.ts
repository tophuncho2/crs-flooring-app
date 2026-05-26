import { z } from "zod"
import { InventoryExecutionError } from "@builders/application"
import type { InventoryListFilters, UpdateInventoryInput } from "@builders/application"
import type { ListInput } from "@builders/application"
import {
  INVENTORY_DYE_LOT_MAX,
  INVENTORY_INTERNAL_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
  INVENTORY_NOTE_MAX,
  INVENTORY_ROLL_NUMBER_MAX,
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

function optionalBoundedString(value: unknown, max: number, field: string): string {
  const str = optionalString(value, field)
  if (str.length > max) {
    throw new InventoryExecutionError({
      code: "INVENTORY_VALIDATION_FAILED",
      message: `${field} must be ${max} characters or fewer`,
      status: 400,
      field,
    })
  }
  return str
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
  skip: z.coerce.number().int().min(0).default(0),
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
  skip: number
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
    skip: parsed.skip,
    take: parsed.take,
  }
}

// --- Locations picker (warehouse-scoped, distinct) validator ---

const inventoryLocationsSearchQuerySchema = z.object({
  warehouseId: z.string().min(1, "warehouseId is required"),
  search: z.string().optional(),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(OPTIONS_MAX_TAKE)
    .default(OPTIONS_DEFAULT_TAKE),
})

export type ValidatedInventoryLocationsSearchQuery = {
  warehouseId: string
  search?: string
  take: number
}

export function validateInventoryLocationsSearchQuery(
  searchParams: URLSearchParams,
): ValidatedInventoryLocationsSearchQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = inventoryLocationsSearchQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new InventoryExecutionError({
      code: "INVENTORY_VALIDATION_FAILED",
      message: issue?.message ?? "Invalid inventory locations query",
      status: 400,
      ...(issue?.path[0] ? { field: String(issue.path[0]) } : {}),
    })
  }

  const parsed = parseResult.data
  const trimSearch = parsed.search?.trim()
  return {
    warehouseId: parsed.warehouseId.trim(),
    ...(trimSearch ? { search: trimSearch } : {}),
    take: parsed.take,
  }
}

// --- List view query validator (search + filters + pagination) ---

// Multi-value filter keys parsed off the raw URLSearchParams via
// `readMultiValue` (NOT via zod). `warehouseId`/`categoryId`/`productId` are
// canonical entity-id filters; `importNumber`/`purchaseOrderNumber` are the
// denormalized snapshot strings on `flooring_inventory` that the Import #
// and PO # picker chips emit. They share the same multi-value wire shape,
// so they all live in this list.
const MULTI_VALUE_FILTER_KEYS = [
  "warehouseId",
  "categoryId",
  "productId",
  "importNumber",
  "purchaseOrderNumber",
] as const
type MultiValueFilterKey = (typeof MULTI_VALUE_FILTER_KEYS)[number]

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
  // Strip multi-value filter keys before zod validation — zod sees only scalar params.
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if ((MULTI_VALUE_FILTER_KEYS as readonly string[]).includes(key)) return
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

  const multiValueEntries: Array<[MultiValueFilterKey, string[]]> =
    MULTI_VALUE_FILTER_KEYS.map((key) => [key, readMultiValue(searchParams, key)])
  const filterRecord: Partial<InventoryListFilters> = {}
  for (const [key, values] of multiValueEntries) {
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
  // update use case; never accepted from the client. `warehouseId` is
  // set-on-insert by the materialize worker and silently stripped here if
  // a stale client posts it.
  const input: UpdateInventoryInput = {}
  if (body.rollNumber !== undefined)
    input.rollNumber = optionalBoundedString(body.rollNumber, INVENTORY_ROLL_NUMBER_MAX, "rollNumber")
  if (body.dyeLot !== undefined)
    input.dyeLot = optionalBoundedString(body.dyeLot, INVENTORY_DYE_LOT_MAX, "dyeLot")
  if (body.location !== undefined)
    input.location = optionalBoundedString(body.location, INVENTORY_LOCATION_MAX, "location")
  if (body.note !== undefined) input.note = optionalBoundedString(body.note, INVENTORY_NOTE_MAX, "note")
  if (body.internalNotes !== undefined)
    input.internalNotes = optionalBoundedString(body.internalNotes, INVENTORY_INTERNAL_NOTES_MAX, "internalNotes")
  if (body.isArchived !== undefined) input.isArchived = requireBoolean(body.isArchived, "isArchived")
  return input
}
