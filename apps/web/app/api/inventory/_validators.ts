import { z } from "zod"
import { CutLogExecutionError, InventoryExecutionError } from "@builders/application"
import type { InventoryListFilters, UpdateInventoryInput } from "@builders/application"
import type { ListInput } from "@builders/application"
import {
  CUT_LOG_NOTES_MAX,
  INVENTORY_CUT_LOG_MAX_PAGE_SIZE,
  INVENTORY_CUT_LOG_PAGE_SIZE,
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

// --- Import # / PO # picker (inventory-row-backed, distinct) validators ---
//
// Distinct-snapshot pickers backed by `flooring_inventory.importNumber` and
// `.purchaseOrderNumber` (not by `FlooringImportEntry`). Both share the same
// shape: required warehouseId scope, optional archive scope (mirrors the
// inventory list's archive segmented control), optional search, clamped take.

const inventoryImportNumberOptionsQuerySchema = z.object({
  warehouseId: z.string().min(1, "warehouseId is required"),
  archived: z.enum(["true", "false"]).optional(),
  search: z.string().optional(),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(OPTIONS_MAX_TAKE)
    .default(OPTIONS_DEFAULT_TAKE),
})

export type ValidatedInventoryImportNumberOptionsQuery = {
  warehouseId: string
  isArchived?: boolean
  search?: string
  take: number
}

export function validateInventoryImportNumberOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedInventoryImportNumberOptionsQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = inventoryImportNumberOptionsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new InventoryExecutionError({
      code: "INVENTORY_VALIDATION_FAILED",
      message: issue?.message ?? "Invalid inventory import-number options query",
      status: 400,
      ...(issue?.path[0] ? { field: String(issue.path[0]) } : {}),
    })
  }

  const parsed = parseResult.data
  const trimSearch = parsed.search?.trim()
  const isArchived =
    parsed.archived === "true" ? true : parsed.archived === "false" ? false : undefined
  return {
    warehouseId: parsed.warehouseId.trim(),
    ...(isArchived !== undefined ? { isArchived } : {}),
    ...(trimSearch ? { search: trimSearch } : {}),
    take: parsed.take,
  }
}

// PO # picker shares the import-number picker's wire shape. Kept as a separate
// validator (and exported type) so route handlers stay one-validator-per-route.
export type ValidatedInventoryPurchaseOrderOptionsQuery =
  ValidatedInventoryImportNumberOptionsQuery

export function validateInventoryPurchaseOrderOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedInventoryPurchaseOrderOptionsQuery {
  return validateInventoryImportNumberOptionsQuery(searchParams)
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

// ---------------------------------------------------------------------------
// Per-row pending cut-log mutations (inv-side; one row per request)
// ---------------------------------------------------------------------------
//
// Cut logs are CREATED only from the work-orders side (grouped under
// WOMI rows in the UI). The inventory record view's cut-log side panel
// supports the four scope-aware mutations (update / delete / void /
// finalize) against rows already linked to the inventory. The route
// handler stamps `scope: { kind: "inventory", inventoryId: params.id }`
// before calling the use case; these validators handle the body-only
// portion (no scope, no path identifiers).
//
// Identical shapes are used on both sides — naming is suffix-free
// (e.g. `validateUpdatePendingCutLogInput`) and lives in the per-module
// validator file. The WO-side file has a sibling set with the same
// names plus per-module ergonomics (`workOrderItemId` was historically
// in the WO request body but is no longer required).

function failCutLog(message: string, field?: string): never {
  throw new CutLogExecutionError({
    code: "CUT_LOG_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

function requireCutLogString(value: unknown, field: string): string {
  if (typeof value !== "string") failCutLog(`${field} is required`, field)
  const trimmed = (value as string).trim()
  if (!trimmed) failCutLog(`${field} is required`, field)
  return trimmed
}

function requireCutLogObject(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    failCutLog(`${path} must be an object`, path)
  }
  return value as Record<string, unknown>
}

export type ValidatedInvUpdatePendingCutLogLink = {
  workOrderId: string | null
  workOrderItemId: string | null
}

export type ValidatedInvUpdatePendingCutLogPatch = {
  cut?: string
  isWaste?: boolean
  notes?: string
  link?: ValidatedInvUpdatePendingCutLogLink
}

export type ValidatedInvUpdatePendingCutLogInput = {
  patch: ValidatedInvUpdatePendingCutLogPatch
}

function validateInvUpdatePendingCutLogLink(
  value: unknown,
): ValidatedInvUpdatePendingCutLogLink {
  const obj = requireCutLogObject(value, "patch.link")
  const rawWO = obj.workOrderId
  const rawWOMI = obj.workOrderItemId
  if (rawWO !== null && typeof rawWO !== "string") {
    failCutLog("patch.link.workOrderId must be a string or null", "patch.link.workOrderId")
  }
  if (rawWOMI !== null && typeof rawWOMI !== "string") {
    failCutLog(
      "patch.link.workOrderItemId must be a string or null",
      "patch.link.workOrderItemId",
    )
  }
  const workOrderId =
    rawWO === null
      ? null
      : (rawWO as string).trim() ||
        (failCutLog("patch.link.workOrderId is required when present", "patch.link.workOrderId") as never)
  const workOrderItemId =
    rawWOMI === null
      ? null
      : (rawWOMI as string).trim() ||
        (failCutLog("patch.link.workOrderItemId is required when present", "patch.link.workOrderItemId") as never)
  if ((workOrderId === null) !== (workOrderItemId === null)) {
    failCutLog(
      "patch.link must set both workOrderId and workOrderItemId or both to null",
      "patch.link",
    )
  }
  return { workOrderId, workOrderItemId }
}

export function validateInvUpdatePendingCutLogInput(
  body: Record<string, unknown>,
): ValidatedInvUpdatePendingCutLogInput {
  const patchBody = requireCutLogObject(body.patch, "patch")
  const patch: ValidatedInvUpdatePendingCutLogPatch = {}
  if ("cut" in patchBody) {
    patch.cut = requireCutLogString(patchBody.cut, "patch.cut")
  }
  if ("isWaste" in patchBody && typeof patchBody.isWaste === "boolean") {
    patch.isWaste = patchBody.isWaste
  }
  if ("notes" in patchBody && typeof patchBody.notes === "string") {
    if (patchBody.notes.length > CUT_LOG_NOTES_MAX) {
      failCutLog(`patch.notes must be ${CUT_LOG_NOTES_MAX} characters or fewer`, "patch.notes")
    }
    patch.notes = patchBody.notes
  }
  if ("link" in patchBody) {
    patch.link = validateInvUpdatePendingCutLogLink(patchBody.link)
  }
  if (Object.keys(patch).length === 0) {
    failCutLog(
      "Patch must contain at least one of cut, isWaste, notes, or link",
      "patch",
    )
  }
  return { patch }
}

export type ValidatedInvDeletePendingCutLogInput = Record<string, never>

export function validateInvDeletePendingCutLogInput(
  _body: Record<string, unknown>,
): ValidatedInvDeletePendingCutLogInput {
  return {}
}

export type ValidatedInvVoidCutLogInput = Record<string, never>

export function validateInvVoidCutLogInput(
  _body: Record<string, unknown>,
): ValidatedInvVoidCutLogInput {
  return {}
}

export type ValidatedInvFinalizeCutLogInput = Record<string, never>

export function validateInvFinalizeCutLogInput(
  _body: Record<string, unknown>,
): ValidatedInvFinalizeCutLogInput {
  return {}
}

// --- Inventory cut-logs list (paginated section query) ---

const inventoryCutLogsPageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(INVENTORY_CUT_LOG_MAX_PAGE_SIZE)
    .default(INVENTORY_CUT_LOG_PAGE_SIZE),
})

export type ValidatedInventoryCutLogsPageQuery = {
  page: number
  pageSize: number
}

export function validateInventoryCutLogsPageQuery(
  searchParams: URLSearchParams,
): ValidatedInventoryCutLogsPageQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = inventoryCutLogsPageQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    failCutLog(
      issue?.message ?? "Invalid cut-logs list query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  return parseResult.data
}
