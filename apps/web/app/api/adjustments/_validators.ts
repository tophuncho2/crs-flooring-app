import { z } from "zod"
import { InventoryAdjustmentExecutionError } from "@builders/application"
import type { ListInput } from "@builders/application"
import {
  INVENTORY_ADJUSTMENT_NOTES_MAX,
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
  workOrderId: string | null
  workOrderItemId: string | null
  warehouseId: string | null
}

/**
 * Manual adjustment create from the inventory hub. Used by
 * `POST /api/inventory/[id]/adjustments`. The parent inventory id rides on the
 * route path. The body carries direction + amount + waste + notes, and MAY
 * carry an optional WO link (`workOrderId` + `workOrderItemId`, both-or-neither)
 * — an INCREASE may now link a work order. `warehouseId` is the form's selected
 * warehouse filter; the use case asserts it matches the inventory's warehouse.
 * `isWaste` is a reporting flag allowed on either direction.
 */
export function validateCreateManualAdjustmentInput(
  body: Record<string, unknown>,
): ValidatedCreateManualAdjustmentInput {
  const rawType = body.adjustmentType
  if (rawType !== "INCREASE" && rawType !== "DEDUCTION") {
    failAdjustment("adjustmentType must be INCREASE or DEDUCTION", "adjustmentType")
  }
  const link = parseOptionalAdjustmentLink(body.workOrderId, body.workOrderItemId)
  const warehouseId =
    body.warehouseId === undefined || body.warehouseId === null
      ? null
      : requireAdjustmentString(body.warehouseId, "warehouseId")
  const isWaste = typeof body.isWaste === "boolean" ? body.isWaste : false
  return {
    adjustmentType: rawType,
    quantity: requireAdjustmentString(body.quantity, "quantity"),
    isWaste,
    notes: optionalBoundedAdjustmentText(body.notes, INVENTORY_ADJUSTMENT_NOTES_MAX, "notes") ?? "",
    workOrderId: link.workOrderId,
    workOrderItemId: link.workOrderItemId,
    warehouseId,
  }
}

/**
 * Shared parser for an optional WO link: both ids set, or both absent/null.
 * An asymmetric pair is a 400. Returns `{ null, null }` when the link is omitted.
 */
function parseOptionalAdjustmentLink(
  rawWorkOrderId: unknown,
  rawWorkOrderItemId: unknown,
): { workOrderId: string | null; workOrderItemId: string | null } {
  const hasWO = rawWorkOrderId !== undefined && rawWorkOrderId !== null
  const hasWOMI = rawWorkOrderItemId !== undefined && rawWorkOrderItemId !== null
  if (!hasWO && !hasWOMI) return { workOrderId: null, workOrderItemId: null }
  if (hasWO !== hasWOMI) {
    failAdjustment(
      "workOrderId and workOrderItemId must both be set or both omitted",
      "workOrderId",
    )
  }
  return {
    workOrderId: requireAdjustmentString(rawWorkOrderId, "workOrderId"),
    workOrderItemId: requireAdjustmentString(rawWorkOrderItemId, "workOrderItemId"),
  }
}

export type ValidatedUpdatePendingAdjustmentLink = {
  workOrderId: string | null
  workOrderItemId: string | null
}

export type ValidatedUpdatePendingAdjustmentPatch = {
  quantity?: string
  isWaste?: boolean
  notes?: string
  link?: ValidatedUpdatePendingAdjustmentLink
}

export type ValidatedUpdatePendingAdjustmentInput = {
  patch: ValidatedUpdatePendingAdjustmentPatch
}

function validateUpdatePendingAdjustmentLink(value: unknown): ValidatedUpdatePendingAdjustmentLink {
  const obj = requireAdjustmentObject(value, "patch.link")
  const rawWO = obj.workOrderId
  const rawWOMI = obj.workOrderItemId
  if (rawWO !== null && typeof rawWO !== "string") {
    failAdjustment("patch.link.workOrderId must be a string or null", "patch.link.workOrderId")
  }
  if (rawWOMI !== null && typeof rawWOMI !== "string") {
    failAdjustment("patch.link.workOrderItemId must be a string or null", "patch.link.workOrderItemId")
  }
  const workOrderId =
    rawWO === null
      ? null
      : (rawWO as string).trim() ||
        (failAdjustment("patch.link.workOrderId is required when present", "patch.link.workOrderId") as never)
  const workOrderItemId =
    rawWOMI === null
      ? null
      : (rawWOMI as string).trim() ||
        (failAdjustment(
          "patch.link.workOrderItemId is required when present",
          "patch.link.workOrderItemId",
        ) as never)
  if ((workOrderId === null) !== (workOrderItemId === null)) {
    failAdjustment(
      "patch.link must set both workOrderId and workOrderItemId or both to null",
      "patch.link",
    )
  }
  return { workOrderId, workOrderItemId }
}

export function validateUpdatePendingAdjustmentInput(
  body: Record<string, unknown>,
): ValidatedUpdatePendingAdjustmentInput {
  const patchBody = requireAdjustmentObject(body.patch, "patch")
  const patch: ValidatedUpdatePendingAdjustmentPatch = {}
  if ("quantity" in patchBody) {
    patch.quantity = requireAdjustmentString(patchBody.quantity, "patch.quantity")
  }
  if ("isWaste" in patchBody && typeof patchBody.isWaste === "boolean") {
    patch.isWaste = patchBody.isWaste
  }
  if ("notes" in patchBody) {
    const next = optionalBoundedAdjustmentText(patchBody.notes, INVENTORY_ADJUSTMENT_NOTES_MAX, "patch.notes")
    if (next !== null) patch.notes = next
  }
  if ("link" in patchBody) {
    patch.link = validateUpdatePendingAdjustmentLink(patchBody.link)
  }
  if (Object.keys(patch).length === 0) {
    failAdjustment("Patch must contain at least one of quantity, isWaste, notes, or link", "patch")
  }
  return { patch }
}

export type ValidatedDeletePendingAdjustmentInput = Record<string, never>

export function validateDeletePendingAdjustmentInput(
  _body: Record<string, unknown>,
): ValidatedDeletePendingAdjustmentInput {
  return {}
}

export type ValidatedFinalizeAdjustmentInput = Record<string, never>

export function validateFinalizeAdjustmentInput(
  _body: Record<string, unknown>,
): ValidatedFinalizeAdjustmentInput {
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
// Warehouse is the only chip filter (multi-value, parsed off the raw params).
// The four identity search bars (`invNumber`/`rollNumber`/`dyeLot`/`note`) each
// ILIKE their own frozen snapshot column in the data layer.

const listAdjustmentsQuerySchema = z.object({
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
  // Strip the multi-value `warehouseId` before zod (it sees scalars only).
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key === "warehouseId") return
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
  const invNumber = trim(parsed.invNumber)
  const rollNumber = trim(parsed.rollNumber)
  const dyeLot = trim(parsed.dyeLot)
  const note = trim(parsed.note)

  const warehouseId = Array.from(
    new Set(
      searchParams
        .getAll("warehouseId")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  )

  const filters: Partial<InventoryAdjustmentListFilters> = {}
  if (warehouseId.length > 0) filters.warehouseId = warehouseId
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
