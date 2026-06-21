import { z } from "zod"
import { InventoryExecutionError } from "@builders/application"
import type {
  CreateInventoryInput,
  InventoryListFilters,
  ListInventoryMergeCandidatesInput,
  MergeInventoryInput,
  UpdateInventoryInput,
} from "@builders/application"
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

  return {
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

function stringIdArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new InventoryExecutionError({
      code: "INVENTORY_VALIDATION_FAILED",
      message: `${field} must be an array`,
      status: 400,
      field,
    })
  }
  return value.map((entry, index) => {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new InventoryExecutionError({
        code: "INVENTORY_VALIDATION_FAILED",
        message: `${field}[${index}] must be a non-empty string`,
        status: 400,
        field,
      })
    }
    return entry
  })
}

/**
 * Shape validator for the merge-inventory action. `productId` + `warehouseId`
 * select the snapshot/relation; `sourceInventoryIds` is the set of rows being
 * consolidated; the rest are the editable cells coerced to strings. The merged
 * row's `startingStock` is deliberately NOT accepted — it is computed
 * server-authoritative from the locked sources. Business rules (≥2 sources, one
 * product, positive stock, length caps) run in the domain/use case as a 422.
 */
export function validateMergeInventoryInput(
  body: Record<string, unknown>,
): MergeInventoryInput {
  return {
    productId: optionalString(body.productId, "productId"),
    warehouseId: optionalString(body.warehouseId, "warehouseId"),
    sourceInventoryIds: stringIdArray(body.sourceInventoryIds, "sourceInventoryIds"),
    rollNumber: optionalString(body.rollNumber, "rollNumber"),
    dyeLot: optionalString(body.dyeLot, "dyeLot"),
    note: optionalString(body.note, "note"),
    location: optionalString(body.location, "location"),
    internalNotes: optionalString(body.internalNotes, "internalNotes"),
  }
}

// --- Merge-candidate picker query validator (product-scoped, paginated) ---

const mergeCandidatesQuerySchema = z.object({
  productId: z.string().min(1, "productId is required"),
  warehouseId: z.string().optional(),
  invNumber: z.string().optional(),
  rollNumber: z.string().optional(),
  dyeLot: z.string().optional(),
  note: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_INVENTORY_MAX_PAGE_SIZE)
    .default(LIST_INVENTORY_PAGE_SIZE),
})

export function validateMergeCandidatesQuery(
  searchParams: URLSearchParams,
): ListInventoryMergeCandidatesInput {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = mergeCandidatesQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new InventoryExecutionError({
      code: "INVENTORY_VALIDATION_FAILED",
      message: issue?.message ?? "Invalid merge candidates query",
      status: 400,
      ...(issue?.path[0] ? { field: String(issue.path[0]) } : {}),
    })
  }

  const parsed = parseResult.data
  const trim = (value: string | undefined): string | undefined => {
    const t = value?.trim()
    return t && t.length > 0 ? t : undefined
  }
  return {
    productId: parsed.productId.trim(),
    ...(trim(parsed.warehouseId) ? { warehouseId: trim(parsed.warehouseId) } : {}),
    ...(trim(parsed.invNumber) ? { invNumber: trim(parsed.invNumber) } : {}),
    ...(trim(parsed.rollNumber) ? { rollNumber: trim(parsed.rollNumber) } : {}),
    ...(trim(parsed.dyeLot) ? { dyeLot: trim(parsed.dyeLot) } : {}),
    ...(trim(parsed.note) ? { note: trim(parsed.note) } : {}),
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}
