import { z } from "zod"
import { InventoryAdjustmentExecutionError } from "@builders/application"
import type { ListInput } from "@builders/application"
import {
  INVENTORY_ADJUSTMENT_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
  INVENTORY_ADJUSTMENTS_LIST_MAX_PAGE_SIZE,
  INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE,
  INVENTORY_ADJUSTMENT_MAX_PAGE_SIZE,
  INVENTORY_ADJUSTMENT_PAGE_SIZE,
  type InventoryAdjustmentListFilters,
} from "@builders/domain"

// Adjustment mutations are one scope-aware use-case set called from two route
// trees — `api/inventory/[id]/adjustments/...` and
// `api/work-orders/[id]/adjustments/...`. Their body validators are identical, so
// they live here once. This folder has no `route.ts`; it is a validator module
// only. Each route stamps its own scope/path identifiers before the use case.

function failAdjustment(message: string, field?: string): never {
  throw new InventoryAdjustmentExecutionError({
    code: "INVENTORY_ADJUSTMENT_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

function requireAdjustmentString(value: unknown, field: string): string {
  if (typeof value !== "string") failAdjustment(`${field} is required`, field)
  const trimmed = (value as string).trim()
  if (!trimmed) failAdjustment(`${field} is required`, field)
  return trimmed
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

export type ValidatedCreateManualAdjustmentInput = {
  adjustmentType: "INCREASE" | "DEDUCTION"
  quantity: string
  isWaste: boolean
  notes: string
  location: string | null
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
      : requireAdjustmentString(body.warehouseId, "warehouseId")
  const isWaste = typeof body.isWaste === "boolean" ? body.isWaste : false
  const location = optionalBoundedAdjustmentText(body.location, INVENTORY_LOCATION_MAX, "location")
  return {
    adjustmentType: rawType,
    quantity: requireAdjustmentString(body.quantity, "quantity"),
    isWaste,
    notes: optionalBoundedAdjustmentText(body.notes, INVENTORY_ADJUSTMENT_NOTES_MAX, "notes") ?? "",
    location: location && location.trim() !== "" ? location : null,
    workOrderId,
    warehouseId,
  }
}

/**
 * Shared parser for an optional `workOrderId` link. Returns `null` when omitted.
 */
function parseOptionalWorkOrderId(rawWorkOrderId: unknown): string | null {
  if (rawWorkOrderId === undefined || rawWorkOrderId === null) return null
  return requireAdjustmentString(rawWorkOrderId, "workOrderId")
}

export type ValidatedUpdatePendingAdjustmentLink = {
  workOrderId: string | null
}

export type ValidatedUpdatePendingAdjustmentPatch = {
  quantity?: string
  adjustmentType?: "INCREASE" | "DEDUCTION"
  isWaste?: boolean
  notes?: string
  location?: string | null
  link?: ValidatedUpdatePendingAdjustmentLink
}

export type ValidatedUpdatePendingAdjustmentInput = {
  patch: ValidatedUpdatePendingAdjustmentPatch
}

function validateUpdatePendingAdjustmentLink(value: unknown): ValidatedUpdatePendingAdjustmentLink {
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

export function validateUpdatePendingAdjustmentInput(
  body: Record<string, unknown>,
): ValidatedUpdatePendingAdjustmentInput {
  const patchBody = requireAdjustmentObject(body.patch, "patch")
  const patch: ValidatedUpdatePendingAdjustmentPatch = {}
  if ("quantity" in patchBody) {
    patch.quantity = requireAdjustmentString(patchBody.quantity, "patch.quantity")
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
  if ("notes" in patchBody) {
    const next = optionalBoundedAdjustmentText(patchBody.notes, INVENTORY_ADJUSTMENT_NOTES_MAX, "patch.notes")
    if (next !== null) patch.notes = next
  }
  if ("location" in patchBody) {
    // User-owned free text; a blank/absent value clears it to null.
    const next = optionalBoundedAdjustmentText(patchBody.location, INVENTORY_LOCATION_MAX, "patch.location")
    patch.location = next && next.trim() !== "" ? next : null
  }
  if ("link" in patchBody) {
    patch.link = validateUpdatePendingAdjustmentLink(patchBody.link)
  }
  if (Object.keys(patch).length === 0) {
    failAdjustment(
      "Patch must contain at least one of quantity, adjustmentType, isWaste, notes, location, or link",
      "patch",
    )
  }
  return { patch }
}

export type ValidatedDeletePendingAdjustmentInput = Record<string, never>

export function validateDeletePendingAdjustmentInput(
  _body: Record<string, unknown>,
): ValidatedDeletePendingAdjustmentInput {
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
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = adjustmentsPageQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    failAdjustment(
      issue?.message ?? "Invalid adjustments list query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  return parseResult.data
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

const listAdjustmentsQuerySchema = z.object({
  adjNumber: z.string().optional(),
  invNumber: z.string().optional(),
  rollNumber: z.string().optional(),
  dyeLot: z.string().optional(),
  note: z.string().optional(),
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

  return {
    filters: hasAnyFilter ? (filters as InventoryAdjustmentListFilters) : undefined,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}
