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

// Cut-log mutations are one scope-aware use-case set called from two route
// trees — `api/inventory/[id]/cut-logs/...` and
// `api/work-orders/[id]/cut-logs/...`. Their body validators are identical, so
// they live here once. This folder has no `route.ts`; it is a validator module
// only. Each route stamps its own scope/path identifiers before the use case.

function failCutLog(message: string, field?: string): never {
  throw new InventoryAdjustmentExecutionError({
    code: "INVENTORY_ADJUSTMENT_VALIDATION_FAILED",
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

function optionalBoundedCutLogText(value: unknown, max: number, field: string): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") return null
  if (value.length > max) failCutLog(`${field} must be ${max} characters or fewer`, field)
  return value
}

function requireCutLogObject(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    failCutLog(`${path} must be an object`, path)
  }
  return value as Record<string, unknown>
}

export type ValidatedCreatePendingCutLogInput = {
  workOrderItemId: string
  inventoryId: string
  quantity: string
  isWaste: boolean
  notes: string
}

export function validateCreatePendingCutLogInput(
  body: Record<string, unknown>,
): ValidatedCreatePendingCutLogInput {
  const isWaste = typeof body.isWaste === "boolean" ? body.isWaste : false
  return {
    workOrderItemId: requireCutLogString(body.workOrderItemId, "workOrderItemId"),
    inventoryId: requireCutLogString(body.inventoryId, "inventoryId"),
    quantity: requireCutLogString(body.quantity, "quantity"),
    isWaste,
    notes: optionalBoundedCutLogText(body.notes, INVENTORY_ADJUSTMENT_NOTES_MAX, "notes") ?? "",
  }
}

export type ValidatedUpdatePendingCutLogLink = {
  workOrderId: string | null
  workOrderItemId: string | null
}

export type ValidatedUpdatePendingCutLogPatch = {
  quantity?: string
  isWaste?: boolean
  notes?: string
  link?: ValidatedUpdatePendingCutLogLink
}

export type ValidatedUpdatePendingCutLogInput = {
  patch: ValidatedUpdatePendingCutLogPatch
}

function validateUpdatePendingCutLogLink(value: unknown): ValidatedUpdatePendingCutLogLink {
  const obj = requireCutLogObject(value, "patch.link")
  const rawWO = obj.workOrderId
  const rawWOMI = obj.workOrderItemId
  if (rawWO !== null && typeof rawWO !== "string") {
    failCutLog("patch.link.workOrderId must be a string or null", "patch.link.workOrderId")
  }
  if (rawWOMI !== null && typeof rawWOMI !== "string") {
    failCutLog("patch.link.workOrderItemId must be a string or null", "patch.link.workOrderItemId")
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
        (failCutLog(
          "patch.link.workOrderItemId is required when present",
          "patch.link.workOrderItemId",
        ) as never)
  if ((workOrderId === null) !== (workOrderItemId === null)) {
    failCutLog(
      "patch.link must set both workOrderId and workOrderItemId or both to null",
      "patch.link",
    )
  }
  return { workOrderId, workOrderItemId }
}

export function validateUpdatePendingCutLogInput(
  body: Record<string, unknown>,
): ValidatedUpdatePendingCutLogInput {
  const patchBody = requireCutLogObject(body.patch, "patch")
  const patch: ValidatedUpdatePendingCutLogPatch = {}
  if ("quantity" in patchBody) {
    patch.quantity = requireCutLogString(patchBody.quantity, "patch.quantity")
  }
  if ("isWaste" in patchBody && typeof patchBody.isWaste === "boolean") {
    patch.isWaste = patchBody.isWaste
  }
  if ("notes" in patchBody) {
    const next = optionalBoundedCutLogText(patchBody.notes, INVENTORY_ADJUSTMENT_NOTES_MAX, "patch.notes")
    if (next !== null) patch.notes = next
  }
  if ("link" in patchBody) {
    patch.link = validateUpdatePendingCutLogLink(patchBody.link)
  }
  if (Object.keys(patch).length === 0) {
    failCutLog("Patch must contain at least one of quantity, isWaste, notes, or link", "patch")
  }
  return { patch }
}

export type ValidatedDeletePendingCutLogInput = Record<string, never>

export function validateDeletePendingCutLogInput(
  _body: Record<string, unknown>,
): ValidatedDeletePendingCutLogInput {
  return {}
}

export type ValidatedFinalizeCutLogInput = Record<string, never>

export function validateFinalizeCutLogInput(
  _body: Record<string, unknown>,
): ValidatedFinalizeCutLogInput {
  return {}
}

const cutLogsPageQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(INVENTORY_ADJUSTMENT_MAX_PAGE_SIZE)
    .default(INVENTORY_ADJUSTMENT_PAGE_SIZE),
})

export type ValidatedCutLogsPageQuery = {
  skip: number
  take: number
}

export function validateCutLogsPageQuery(
  searchParams: URLSearchParams,
): ValidatedCutLogsPageQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = cutLogsPageQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    failCutLog(
      issue?.message ?? "Invalid cut-logs list query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  return parseResult.data
}

// --- Standalone cut-logs ledger list query validator (GET /api/cut-logs) ---
// Warehouse is the only filter (multi-value, parsed off the raw params); the
// search term `q` targets `inventoryItem` in the data layer.

const listCutLogsQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(INVENTORY_ADJUSTMENTS_LIST_MAX_PAGE_SIZE)
    .default(INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE),
})

export function validateCutLogsListQuery(
  searchParams: URLSearchParams,
): ListInput<InventoryAdjustmentListFilters> {
  // Strip the multi-value `warehouseId` before zod (it sees scalars only).
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key === "warehouseId") return
    raw[key] = value
  })

  const parseResult = listCutLogsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    failCutLog(
      issue?.message ?? "Invalid cut-logs list query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
  const trimmedSearch = parsed.q?.trim()
  const search = trimmedSearch ? trimmedSearch : undefined

  const warehouseId = Array.from(
    new Set(
      searchParams
        .getAll("warehouseId")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  )

  return {
    search,
    filters: warehouseId.length > 0 ? { warehouseId } : undefined,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}
