import { z } from "zod"
import { InventoryExecutionError } from "@builders/application"
import type {
  CreateInventoryInput,
  InventoryExportInput,
  InventoryListFilters,
  UpdateInventoryInput,
} from "@builders/application"
import type { ListInput, ListSort } from "@builders/application"
import {
  INVENTORY_EXPORT_COLUMNS,
  INVENTORY_INTERNAL_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
  isPaletteColor,
  LIST_INVENTORY_MAX_PAGE_SIZE,
  LIST_INVENTORY_PAGE_SIZE,
  PALETTE_COLOR_INVALID_MESSAGE,
  type PaletteColor,
} from "@builders/domain"
import { parseExportEnvelope } from "@/server/http/export-request"

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

// Palette color. Non-semantic visual tag — strictly validated when present on
// update (the form always carries the current color). Create never accepts it:
// manual + worker-materialized rows fall to the DB default (SLATE).
function requireColor(value: unknown, field: string): PaletteColor {
  if (!isPaletteColor(value)) {
    throw new InventoryExecutionError({
      code: "INVENTORY_VALIDATION_FAILED",
      message: PALETTE_COLOR_INVALID_MESSAGE,
      status: 400,
      field,
    })
  }
  return value
}

// --- Shared picker pagination bounds (locations / PO# / import# search) ---

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

// --- Locations picker (warehouse-scoped, distinct) validator ---

const inventoryLocationsSearchQuerySchema = z.object({
  warehouseId: z.string().min(1, "warehouseId is required"),
  search: z.string().optional(),
  skip: z.coerce.number().int().min(0).default(0),
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
  skip: number
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
    skip: parsed.skip,
    take: parsed.take,
  }
}

// --- Import PO# picker (global, distinct) validator ---

const inventoryPurchaseOrderSearchQuerySchema = z.object({
  search: z.string().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(OPTIONS_MAX_TAKE)
    .default(OPTIONS_DEFAULT_TAKE),
})

export type ValidatedInventoryPurchaseOrderSearchQuery = {
  search?: string
  skip: number
  take: number
}

export function validateInventoryPurchaseOrderSearchQuery(
  searchParams: URLSearchParams,
): ValidatedInventoryPurchaseOrderSearchQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = inventoryPurchaseOrderSearchQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new InventoryExecutionError({
      code: "INVENTORY_VALIDATION_FAILED",
      message: issue?.message ?? "Invalid inventory purchase order query",
      status: 400,
      ...(issue?.path[0] ? { field: String(issue.path[0]) } : {}),
    })
  }

  const parsed = parseResult.data
  const trimSearch = parsed.search?.trim()
  return {
    ...(trimSearch ? { search: trimSearch } : {}),
    skip: parsed.skip,
    take: parsed.take,
  }
}

// --- Import # picker (global, distinct) validator ---

const inventoryImportNumberSearchQuerySchema = z.object({
  search: z.string().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(OPTIONS_MAX_TAKE)
    .default(OPTIONS_DEFAULT_TAKE),
})

export type ValidatedInventoryImportNumberSearchQuery = {
  search?: string
  skip: number
  take: number
}

export function validateInventoryImportNumberSearchQuery(
  searchParams: URLSearchParams,
): ValidatedInventoryImportNumberSearchQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = inventoryImportNumberSearchQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new InventoryExecutionError({
      code: "INVENTORY_VALIDATION_FAILED",
      message: issue?.message ?? "Invalid inventory import number query",
      status: 400,
      ...(issue?.path[0] ? { field: String(issue.path[0]) } : {}),
    })
  }

  const parsed = parseResult.data
  const trimSearch = parsed.search?.trim()
  return {
    ...(trimSearch ? { search: trimSearch } : {}),
    skip: parsed.skip,
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
  invNumber: z.string().optional(),
  rollNumber: z.string().optional(),
  dyeLot: z.string().optional(),
  note: z.string().optional(),
  location: z.string().optional(),
  archived: z.enum(["true", "false"]).optional(),
  // Sort: direction + field. `createdAt` is the default; row# is intentionally
  // not a sortable field (chronological `createdAt` is the canonical time key).
  // `stockBalance` is the displayed quantity (sorted server-side on the
  // generated `stockQuantity` column in the read repository).
  sort: z.enum(["asc", "desc"]).default("desc"),
  sortField: z.enum(["createdAt", "location", "stockBalance"]).default("createdAt"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_INVENTORY_MAX_PAGE_SIZE)
    .default(LIST_INVENTORY_PAGE_SIZE),
})

// UI-exposed sortable fields. Row# (`inventoryNumber`) is intentionally excluded
// (chronological `createdAt` is the canonical time key).
const INVENTORY_UI_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "location",
  "stockBalance",
  "productName",
  "warehouse",
] as const
const INVENTORY_MAX_SORT_LEVELS = 3

/** Parse the ordered `sorts=field:dir,field:dir` param (validated, deduped, capped). */
function parseSortsParam(raw: string | null): ListSort[] {
  if (!raw) return []
  const allowed = new Set<string>(INVENTORY_UI_SORT_FIELDS)
  const result: ListSort[] = []
  const seen = new Set<string>()
  for (const token of raw.split(",")) {
    const [field, direction] = token.split(":")
    if (!field || seen.has(field) || !allowed.has(field)) continue
    seen.add(field)
    result.push({ field, direction: direction === "asc" ? "asc" : "desc" })
    if (result.length >= INVENTORY_MAX_SORT_LEVELS) break
  }
  return result
}

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
  const trimmedLocation = parsed.location?.trim()
  const location = trimmedLocation && trimmedLocation.length > 0 ? trimmedLocation : undefined
  const archived =
    parsed.archived === "true" ? true : parsed.archived === "false" ? false : undefined
  const trim = (value: string | undefined): string | undefined => {
    const t = value?.trim()
    return t && t.length > 0 ? t : undefined
  }
  const invNumber = trim(parsed.invNumber)
  const rollNumber = trim(parsed.rollNumber)
  const dyeLot = trim(parsed.dyeLot)
  const note = trim(parsed.note)

  const multiValueEntries: Array<[MultiValueFilterKey, string[]]> =
    MULTI_VALUE_FILTER_KEYS.map((key) => [key, readMultiValue(searchParams, key)])
  const filterRecord: Partial<InventoryListFilters> = {}
  for (const [key, values] of multiValueEntries) {
    if (values.length > 0) filterRecord[key] = values
  }
  if (location) filterRecord.location = location
  if (archived !== undefined) filterRecord.isArchived = archived
  if (invNumber) filterRecord.invNumber = invNumber
  if (rollNumber) filterRecord.rollNumber = rollNumber
  if (dyeLot) filterRecord.dyeLot = dyeLot
  if (note) filterRecord.note = note

  const hasAnyFilter = Object.keys(filterRecord).length > 0

  // Canonical ordered sort via `sorts`; fall back to the legacy single pair.
  const parsedSorts = parseSortsParam(searchParams.get("sorts"))
  const sorts: ListSort[] =
    parsedSorts.length > 0 ? parsedSorts : [{ field: parsed.sortField, direction: parsed.sort }]

  return {
    sort: sorts[0],
    sorts,
    filters: hasAnyFilter ? (filterRecord as InventoryListFilters) : undefined,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}

// --- CSV export request validator (list query + ticked ids + columns + cap) ---

const INVENTORY_EXPORT_COLUMN_KEYS: ReadonlySet<string> = new Set(
  INVENTORY_EXPORT_COLUMNS.map((column) => column.key),
)

export type ValidatedInventoryExport = {
  input: InventoryExportInput
  /** Picked column keys, whitelisted; `undefined` ⇒ all columns. */
  columns?: string[]
}

/**
 * Validate an inventory CSV-export POST body. Reuses {@link validateListInventoryQuery}
 * on the embedded `query` so the export scopes exactly like the list, then
 * layers the ticked `ids`, picked `columns`, and row `cap` on top.
 */
export function validateInventoryExportRequest(body: unknown): ValidatedInventoryExport {
  const envelope = parseExportEnvelope(body, INVENTORY_EXPORT_COLUMN_KEYS)
  const listInput = validateListInventoryQuery(new URLSearchParams(envelope.query))

  return {
    input: {
      ...(listInput.filters ? { filters: listInput.filters } : {}),
      ...(listInput.sort ? { sort: listInput.sort } : {}),
      ...(listInput.sorts ? { sorts: listInput.sorts } : {}),
      ...(envelope.ids ? { ids: envelope.ids } : {}),
      ...(envelope.cap !== undefined ? { cap: envelope.cap } : {}),
    },
    ...(envelope.columns ? { columns: envelope.columns } : {}),
  }
}

export function validateUpdateInventoryInput(body: Record<string, unknown>): UpdateInventoryInput {
  // `warehouseId` is set-on-insert by the materialize worker and silently
  // stripped here if a stale client posts it.
  const input: UpdateInventoryInput = {}
  if (body.location !== undefined)
    input.location = optionalBoundedString(body.location, INVENTORY_LOCATION_MAX, "location")
  if (body.internalNotes !== undefined)
    input.internalNotes = optionalBoundedString(body.internalNotes, INVENTORY_INTERNAL_NOTES_MAX, "internalNotes")
  if (body.isArchived !== undefined) input.isArchived = requireBoolean(body.isArchived, "isArchived")
  if (body.color !== undefined) input.color = requireColor(body.color, "color")
  return input
}

/**
 * Shape validator for the manual create-inventory action. `productId` +
 * `warehouseId` select the snapshot/relation; the rest are coerced to strings
 * (missing → ""). Business rules (product/warehouse required, startingStock a
 * positive number, length caps) run in the domain via the use case and surface
 * as a 422. Snapshot columns are never accepted from the client — they're read
 * from the product server-side.
 */
export function validateCreateInventoryInput(
  body: Record<string, unknown>,
): CreateInventoryInput {
  return {
    productId: optionalString(body.productId, "productId"),
    warehouseId: optionalString(body.warehouseId, "warehouseId"),
    rollNumber: optionalString(body.rollNumber, "rollNumber"),
    dyeLot: optionalString(body.dyeLot, "dyeLot"),
    note: optionalString(body.note, "note"),
    startingStock: optionalString(body.startingStock, "startingStock"),
    cost: optionalString(body.cost, "cost"),
    freight: optionalString(body.freight, "freight"),
    location: optionalString(body.location, "location"),
    internalNotes: optionalString(body.internalNotes, "internalNotes"),
  }
}

