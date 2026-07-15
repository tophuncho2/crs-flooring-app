import { z } from "zod"
import { InventoryAdjustmentExecutionError } from "@builders/application"
import type { AdjustmentsExportInput, ListInput, ListSort } from "@builders/application"
import {
  ADJUSTMENTS_EXPORT_COLUMNS,
  DEFAULT_PALETTE_COLOR,
  INVENTORY_ADJUSTMENT_AREA_MAX,
  INVENTORY_ADJUSTMENT_INTERNAL_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
  INVENTORY_ADJUSTMENTS_LIST_MAX_PAGE_SIZE,
  INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE,
  INVENTORY_ADJUSTMENT_MAX_PAGE_SIZE,
  INVENTORY_ADJUSTMENT_PAGE_SIZE,
  type InventoryAdjustmentListFilters,
  type PaletteColor,
} from "@builders/domain"
import { parseExportEnvelope, type ExportFormat } from "@/server/http/export-request"
import { parseQuery, requireColor, requireString } from "@/app/api/_shared/validators"

// Adjustment mutation body validators. The use cases are scope-aware, but every
// adjustment mutation currently enters through the inventory route tree
// (`api/inventory/[id]/adjustments/...`). They live here once, shared across
// those route files. This folder has no `route.ts`; it is a validator module
// only. Each route stamps its own scope/path identifiers before the use case.

function failAdjustment(message: string, field?: string): never {
  throw new InventoryAdjustmentExecutionError({
    code: "INVENTORY_ADJUSTMENT_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

function optionalBoundedAdjustmentText(value: unknown, max: number, field: string): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") return null
  if (value.length > max) failAdjustment(`${field} must be ${max} characters or fewer`, field)
  return value
}

function requireAdjustmentObject(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    failAdjustment(`${path} must be an object`, path)
  }
  return value as Record<string, unknown>
}

// Palette color. Required-with-default on create (a missing value falls back to
// the shared default rather than failing), and strictly validated when present
// on update.
function colorOrDefault(value: unknown): PaletteColor {
  if (value === undefined || value === null) return DEFAULT_PALETTE_COLOR
  return requireColor(value, "color", failAdjustment)
}

export type ValidatedCreateManualAdjustmentInput = {
  adjustmentType: "INCREASE" | "DEDUCTION"
  quantity: string
  isWaste: boolean
  internalNotes: string
  color: PaletteColor
  location: string | null
  area: string | null
  workOrderId: string | null
  warehouseId: string | null
}

/**
 * Manual adjustment create from the inventory hub. Used by
 * `POST /api/inventory/[id]/adjustments`. The parent inventory id rides on the
 * route path. The body carries direction + amount + waste + notes, and MAY
 * carry an optional `workOrderId` link (any product, any direction — adjustments
 * never link to a material item). `warehouseId` is the form's selected warehouse
 * filter; the use case asserts it matches the inventory's warehouse. `isWaste`
 * is a reporting flag allowed on either direction.
 */
export function validateCreateManualAdjustmentInput(
  body: Record<string, unknown>,
): ValidatedCreateManualAdjustmentInput {
  const rawType = body.adjustmentType
  if (rawType !== "INCREASE" && rawType !== "DEDUCTION") {
    failAdjustment("adjustmentType must be INCREASE or DEDUCTION", "adjustmentType")
  }
  const workOrderId = parseOptionalWorkOrderId(body.workOrderId)
  const warehouseId =
    body.warehouseId === undefined || body.warehouseId === null
      ? null
      : requireString(body.warehouseId, "warehouseId", failAdjustment)
  const isWaste = typeof body.isWaste === "boolean" ? body.isWaste : false
  const location = optionalBoundedAdjustmentText(body.location, INVENTORY_LOCATION_MAX, "location")
  const area = optionalBoundedAdjustmentText(body.area, INVENTORY_ADJUSTMENT_AREA_MAX, "area")
  return {
    adjustmentType: rawType,
    quantity: requireString(body.quantity, "quantity", failAdjustment),
    isWaste,
    internalNotes:
      optionalBoundedAdjustmentText(body.internalNotes, INVENTORY_ADJUSTMENT_INTERNAL_NOTES_MAX, "internalNotes") ?? "",
    color: colorOrDefault(body.color),
    location: location && location.trim() !== "" ? location : null,
    area: area && area.trim() !== "" ? area : null,
    workOrderId,
    warehouseId,
  }
}

/**
 * Shared parser for an optional `workOrderId` link. Returns `null` when omitted.
 */
function parseOptionalWorkOrderId(rawWorkOrderId: unknown): string | null {
  if (rawWorkOrderId === undefined || rawWorkOrderId === null) return null
  return requireString(rawWorkOrderId, "workOrderId", failAdjustment)
}

export type ValidatedUpdateAdjustmentLink = {
  workOrderId: string | null
}

export type ValidatedUpdateAdjustmentPatch = {
  quantity?: string
  adjustmentType?: "INCREASE" | "DEDUCTION"
  isWaste?: boolean
  internalNotes?: string
  color?: PaletteColor
  location?: string | null
  area?: string | null
  link?: ValidatedUpdateAdjustmentLink
  // Conversion trio — editable; "" clears the FK (use case → disconnect).
  coverageUnitId?: string
  coveragePerUnit?: string
  conversionFormulaId?: string
}

export type ValidatedUpdateAdjustmentInput = {
  patch: ValidatedUpdateAdjustmentPatch
}

/** Coerce to a trimmed string, allowing "" (the FK-clear signal). */
function requireAdjustmentStringAllowEmpty(value: unknown, field: string): string {
  if (typeof value !== "string") failAdjustment(`${field} must be a string`, field)
  return (value as string).trim()
}

function validateUpdateAdjustmentLink(value: unknown): ValidatedUpdateAdjustmentLink {
  const obj = requireAdjustmentObject(value, "patch.link")
  const rawWO = obj.workOrderId
  if (rawWO !== null && typeof rawWO !== "string") {
    failAdjustment("patch.link.workOrderId must be a string or null", "patch.link.workOrderId")
  }
  const workOrderId =
    rawWO === null
      ? null
      : (rawWO as string).trim() ||
        (failAdjustment("patch.link.workOrderId is required when present", "patch.link.workOrderId") as never)
  return { workOrderId }
}

export function validateUpdateAdjustmentInput(
  body: Record<string, unknown>,
): ValidatedUpdateAdjustmentInput {
  const patchBody = requireAdjustmentObject(body.patch, "patch")
  const patch: ValidatedUpdateAdjustmentPatch = {}
  if ("quantity" in patchBody) {
    patch.quantity = requireString(patchBody.quantity, "patch.quantity", failAdjustment)
  }
  if ("adjustmentType" in patchBody) {
    const rawType = patchBody.adjustmentType
    if (rawType !== "INCREASE" && rawType !== "DEDUCTION") {
      failAdjustment(
        "patch.adjustmentType must be INCREASE or DEDUCTION",
        "patch.adjustmentType",
      )
    }
    patch.adjustmentType = rawType
  }
  if ("isWaste" in patchBody && typeof patchBody.isWaste === "boolean") {
    patch.isWaste = patchBody.isWaste
  }
  if ("color" in patchBody) {
    patch.color = requireColor(patchBody.color, "patch.color", failAdjustment)
  }
  if ("internalNotes" in patchBody) {
    const next = optionalBoundedAdjustmentText(
      patchBody.internalNotes,
      INVENTORY_ADJUSTMENT_INTERNAL_NOTES_MAX,
      "patch.internalNotes",
    )
    if (next !== null) patch.internalNotes = next
  }
  if ("location" in patchBody) {
    // User-owned free text; a blank/absent value clears it to null.
    const next = optionalBoundedAdjustmentText(patchBody.location, INVENTORY_LOCATION_MAX, "patch.location")
    patch.location = next && next.trim() !== "" ? next : null
  }
  if ("area" in patchBody) {
    // User-owned free text; a blank/absent value clears it to null.
    const next = optionalBoundedAdjustmentText(patchBody.area, INVENTORY_ADJUSTMENT_AREA_MAX, "patch.area")
    patch.area = next && next.trim() !== "" ? next : null
  }
  if ("link" in patchBody) {
    patch.link = validateUpdateAdjustmentLink(patchBody.link)
  }
  // Conversion trio — plain strings, "" allowed (clears the FK; the use case
  // disconnects). requireString rejects "", so use the allow-empty coercion.
  if ("coverageUnitId" in patchBody) {
    patch.coverageUnitId = requireAdjustmentStringAllowEmpty(patchBody.coverageUnitId, "patch.coverageUnitId")
  }
  if ("coveragePerUnit" in patchBody) {
    patch.coveragePerUnit = requireAdjustmentStringAllowEmpty(patchBody.coveragePerUnit, "patch.coveragePerUnit")
  }
  if ("conversionFormulaId" in patchBody) {
    patch.conversionFormulaId = requireAdjustmentStringAllowEmpty(
      patchBody.conversionFormulaId,
      "patch.conversionFormulaId",
    )
  }
  if (Object.keys(patch).length === 0) {
    failAdjustment(
      "Patch must contain at least one of quantity, adjustmentType, isWaste, internalNotes, color, location, area, link, or a conversion field",
      "patch",
    )
  }
  return { patch }
}

export type ValidatedDeleteAdjustmentInput = Record<string, never>

export function validateDeleteAdjustmentInput(
  _body: Record<string, unknown>,
): ValidatedDeleteAdjustmentInput {
  return {}
}

const adjustmentsPageQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(INVENTORY_ADJUSTMENT_MAX_PAGE_SIZE)
    .default(INVENTORY_ADJUSTMENT_PAGE_SIZE),
})

export type ValidatedAdjustmentsPageQuery = {
  skip: number
  take: number
}

export function validateAdjustmentsPageQuery(
  searchParams: URLSearchParams,
): ValidatedAdjustmentsPageQuery {
  return parseQuery(
    searchParams,
    adjustmentsPageQuerySchema,
    failAdjustment,
    "Invalid adjustments list query",
  )
}

// --- Standalone adjustments ledger list query validator (GET /api/adjustments) ---
// Warehouse, category, and product are multi-value chip filters (parsed off the
// raw params via getAll). The identity search bars: `adjNumber`/`invNumber` are
// exact integer matches on the generated number columns; `rollNumber`/`dyeLot`/
// `note` ILIKE their own frozen snapshot column in the data layer.

const ADJUSTMENTS_MULTI_VALUE_FILTER_KEYS = [
  "warehouseId",
  "categoryId",
  "productId",
] as const
type AdjustmentsMultiValueFilterKey = (typeof ADJUSTMENTS_MULTI_VALUE_FILTER_KEYS)[number]

function readAdjustmentsMultiValue(searchParams: URLSearchParams, key: string): string[] {
  return Array.from(
    new Set(
      searchParams
        .getAll(key)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  )
}

/**
 * Sort fields the adjustments list API accepts. Kept independent of the data
 * request allowlist for defense-in-depth; the sort-allowlist-sync test asserts
 * the two (and the menu) stay identical. `productName` resolves to the live
 * `product.name` relation server-side.
 */
export const ADJUSTMENTS_UI_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "location",
  "productName",
] as const

/** Cap on user-selected sort columns — mirrors the engine + data request + use case. */
const ADJUSTMENTS_MAX_SORT_LEVELS = 3

/** Parse the ordered `?sorts=field:dir,field:dir` param (validated, deduped, capped). */
function parseSortsParam(raw: string | undefined): ListSort[] {
  if (!raw) return []
  const allowed = new Set<string>(ADJUSTMENTS_UI_SORT_FIELDS)
  const result: ListSort[] = []
  const seen = new Set<string>()
  for (const token of raw.split(",")) {
    const [field, direction] = token.split(":")
    if (!field || seen.has(field) || !allowed.has(field)) continue
    seen.add(field)
    result.push({ field, direction: direction === "asc" ? "asc" : "desc" })
    if (result.length >= ADJUSTMENTS_MAX_SORT_LEVELS) break
  }
  return result
}

const listAdjustmentsQuerySchema = z.object({
  adjNumber: z.string().optional(),
  invNumber: z.string().optional(),
  rollNumber: z.string().optional(),
  dyeLot: z.string().optional(),
  note: z.string().optional(),
  sorts: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(INVENTORY_ADJUSTMENTS_LIST_MAX_PAGE_SIZE)
    .default(INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE),
})

export function validateAdjustmentsListQuery(
  searchParams: URLSearchParams,
): ListInput<InventoryAdjustmentListFilters> {
  // Strip the multi-value keys before zod (it sees scalars only).
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if ((ADJUSTMENTS_MULTI_VALUE_FILTER_KEYS as readonly string[]).includes(key)) return
    raw[key] = value
  })

  const parseResult = listAdjustmentsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    failAdjustment(
      issue?.message ?? "Invalid adjustments list query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
  const trim = (value: string | undefined): string | undefined => {
    const t = value?.trim()
    return t && t.length > 0 ? t : undefined
  }
  const adjNumber = trim(parsed.adjNumber)
  const invNumber = trim(parsed.invNumber)
  const rollNumber = trim(parsed.rollNumber)
  const dyeLot = trim(parsed.dyeLot)
  const note = trim(parsed.note)

  const multiValueEntries: Array<[AdjustmentsMultiValueFilterKey, string[]]> =
    ADJUSTMENTS_MULTI_VALUE_FILTER_KEYS.map((key) => [
      key,
      readAdjustmentsMultiValue(searchParams, key),
    ])

  const filters: Partial<InventoryAdjustmentListFilters> = {}
  for (const [key, values] of multiValueEntries) {
    if (values.length > 0) filters[key] = values
  }
  if (adjNumber) filters.adjNumber = adjNumber
  if (invNumber) filters.invNumber = invNumber
  if (rollNumber) filters.rollNumber = rollNumber
  if (dyeLot) filters.dyeLot = dyeLot
  if (note) filters.note = note

  const hasAnyFilter = Object.keys(filters).length > 0

  // Ordered multi-column sort via `?sorts=`; empty when absent (the use case +
  // repo then fall back to the newest-first ledger default).
  const sorts = parseSortsParam(parsed.sorts)

  return {
    filters: hasAnyFilter ? (filters as InventoryAdjustmentListFilters) : undefined,
    ...(sorts.length > 0 ? { sort: sorts[0], sorts } : {}),
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}

// --- CSV export request validator (list query + ticked ids + columns + cap) ---

const ADJUSTMENTS_EXPORT_COLUMN_KEYS: ReadonlySet<string> = new Set(
  ADJUSTMENTS_EXPORT_COLUMNS.map((column) => column.key),
)

export type ValidatedAdjustmentsExport = {
  input: AdjustmentsExportInput
  /** Picked column keys, whitelisted; `undefined` ⇒ all columns. */
  columns?: string[]
  /** Delivery target — Google Sheet (default) or CSV download. */
  format: ExportFormat
}

/**
 * Validate an adjustments CSV-export POST body. Reuses {@link validateAdjustmentsListQuery}
 * on the embedded `query` so the export scopes exactly like the ledger list, then
 * layers the ticked `ids`, picked `columns`, and row `cap` on top.
 */
export function validateAdjustmentsExportRequest(body: unknown): ValidatedAdjustmentsExport {
  const envelope = parseExportEnvelope(body, ADJUSTMENTS_EXPORT_COLUMN_KEYS)
  const listInput = validateAdjustmentsListQuery(new URLSearchParams(envelope.query))

  return {
    input: {
      ...(listInput.filters ? { filters: listInput.filters } : {}),
      ...(listInput.sort ? { sort: listInput.sort } : {}),
      ...(listInput.sorts ? { sorts: listInput.sorts } : {}),
      ...(envelope.ids ? { ids: envelope.ids } : {}),
      ...(envelope.cap !== undefined ? { cap: envelope.cap } : {}),
    },
    ...(envelope.columns ? { columns: envelope.columns } : {}),
    format: envelope.format,
  }
}
