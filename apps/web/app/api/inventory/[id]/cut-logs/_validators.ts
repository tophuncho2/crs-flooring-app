import { CutLogExecutionError } from "@builders/application"
import type {
  CutLogDelete,
  CutLogDraft,
  CutLogPatch,
  CutLogUpdate,
  CutLogsDiff,
} from "@builders/domain"

// ---------------------------------------------------------------------------
// Shared throwers
// ---------------------------------------------------------------------------

function failShape(message: string, field?: string): never {
  throw new CutLogExecutionError({
    code: "CUT_LOG_VALIDATION_FAILED",
    message,
    status: 400,
    ...(field ? { field } : {}),
  })
}

function failDiffShape(message: string, field?: string): never {
  throw new CutLogExecutionError({
    code: "CUT_LOG_DIFF_VALIDATION_FAILED",
    message,
    status: 400,
    ...(field ? { field } : {}),
  })
}

// ---------------------------------------------------------------------------
// Primitive shape helpers (diff-flavoured — throws DIFF_VALIDATION_FAILED)
// ---------------------------------------------------------------------------

function requireDiffString(value: unknown, path: string): string {
  if (typeof value !== "string") failDiffShape(`${path} must be a string`, path)
  return value as string
}

function nullableDiffString(value: unknown, path: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== "string") failDiffShape(`${path} must be a string or null`, path)
  return value as string
}

function requireDiffBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") failDiffShape(`${path} must be a boolean`, path)
  return value as boolean
}

function requireDiffObject(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failDiffShape(`${path} must be an object`, path)
  }
  return value as Record<string, unknown>
}

function requireDiffArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) failDiffShape(`${path} must be an array`, path)
  return value as unknown[]
}

// ---------------------------------------------------------------------------
// Diff entry shapers
// ---------------------------------------------------------------------------

function shapeAddedDraft(raw: unknown, idx: number): CutLogDraft {
  const row = requireDiffObject(raw, `added[${idx}]`)
  return {
    tempId: requireDiffString(row.tempId, `added[${idx}].tempId`),
    cut: requireDiffString(row.cut, `added[${idx}].cut`),
    cost: requireDiffString(row.cost, `added[${idx}].cost`),
    freight: requireDiffString(row.freight, `added[${idx}].freight`),
    isWaste: requireDiffBoolean(row.isWaste, `added[${idx}].isWaste`),
    notes: requireDiffString(row.notes, `added[${idx}].notes`),
  }
}

function shapeModifiedPatch(raw: unknown, idx: number): CutLogPatch {
  const patch = requireDiffObject(raw, `modified[${idx}].patch`)
  const result: CutLogPatch = {}
  if (patch.cut !== undefined) result.cut = requireDiffString(patch.cut, `modified[${idx}].patch.cut`)
  if (patch.cost !== undefined) result.cost = requireDiffString(patch.cost, `modified[${idx}].patch.cost`)
  if (patch.freight !== undefined) result.freight = requireDiffString(patch.freight, `modified[${idx}].patch.freight`)
  if (patch.isWaste !== undefined) result.isWaste = requireDiffBoolean(patch.isWaste, `modified[${idx}].patch.isWaste`)
  if (patch.notes !== undefined) result.notes = requireDiffString(patch.notes, `modified[${idx}].patch.notes`)
  return result
}

function shapeModifiedUpdate(raw: unknown, idx: number): CutLogUpdate {
  const row = requireDiffObject(raw, `modified[${idx}]`)
  return {
    id: requireDiffString(row.id, `modified[${idx}].id`),
    expectedUpdatedAt: requireDiffString(row.expectedUpdatedAt, `modified[${idx}].expectedUpdatedAt`),
    patch: shapeModifiedPatch(row.patch, idx),
  }
}

function shapeDeletedEntry(raw: unknown, idx: number): CutLogDelete {
  const row = requireDiffObject(raw, `deleted[${idx}]`)
  return {
    id: requireDiffString(row.id, `deleted[${idx}].id`),
    expectedUpdatedAt: requireDiffString(row.expectedUpdatedAt, `deleted[${idx}].expectedUpdatedAt`),
  }
}

// ---------------------------------------------------------------------------
// Body validators (one per route)
// ---------------------------------------------------------------------------

/**
 * Body shape for `PATCH /api/inventory/[id]/cut-logs/section`. Maps the
 * raw JSON `diff` block into the domain `CutLogsDiff`. Body-shape only —
 * domain rules (`validateCutLogsDiff`, totalCutSum invariant) run inside
 * the use case under the per-inventory `FOR UPDATE` lock.
 */
export function validateSaveCutLogPendingDiffBody(body: Record<string, unknown>): CutLogsDiff {
  const diffBody = requireDiffObject(body.diff, "diff")
  const added = requireDiffArray(diffBody.added, "diff.added")
  const modified = requireDiffArray(diffBody.modified, "diff.modified")
  const deleted = requireDiffArray(diffBody.deleted, "diff.deleted")
  return {
    added: added.map((entry, idx) => shapeAddedDraft(entry, idx)),
    modified: modified.map((entry, idx) => shapeModifiedUpdate(entry, idx)),
    deleted: deleted.map((entry, idx) => shapeDeletedEntry(entry, idx)),
  }
}

/**
 * Body shape for `POST /api/inventory/[id]/cut-logs/finalize`. Mirrors
 * `validateMarkForImportBody` from the imports validators. Asserts a
 * non-empty array of UUID-shaped strings; the domain validator handles
 * actual finalizability inside the use case.
 */
export function validateMarkCutLogsForFinalizeBody(
  body: Record<string, unknown>,
): { cutLogIds: string[] } {
  const raw = body.cutLogIds
  if (!Array.isArray(raw)) failShape("cutLogIds must be an array", "cutLogIds")
  if (raw.length === 0) failShape("cutLogIds must not be empty", "cutLogIds")
  const cutLogIds = raw.map((value, idx) => {
    if (typeof value !== "string" || value.trim() === "") {
      failShape(`cutLogIds[${idx}] must be a non-empty string`, `cutLogIds[${idx}]`)
    }
    return value as string
  })
  return { cutLogIds }
}

/**
 * Body shape for `POST /api/inventory/[id]/cut-logs/void`. Single-row
 * void per intent doc — never a batch.
 */
export function validateMarkCutLogForVoidBody(
  body: Record<string, unknown>,
): { cutLogId: string } {
  const raw = body.cutLogId
  if (typeof raw !== "string" || raw.trim() === "") {
    failShape("cutLogId must be a non-empty string", "cutLogId")
  }
  return { cutLogId: raw as string }
}

/**
 * Body shape for `PATCH /api/inventory/[id]/cut-logs/links`. Linkage
 * symmetry (both ids set or both null) is enforced by the use case's
 * domain validator (`validateCutLogLinkUpdate`); the route validator
 * only shapes.
 */
export function validateUpdateCutLogLinksBody(body: Record<string, unknown>): {
  cutLogId: string
  workOrderId: string | null
  workOrderItemId: string | null
} {
  const cutLogIdRaw = body.cutLogId
  if (typeof cutLogIdRaw !== "string" || cutLogIdRaw.trim() === "") {
    failShape("cutLogId must be a non-empty string", "cutLogId")
  }
  const workOrderIdRaw = body.workOrderId
  if (workOrderIdRaw !== null && typeof workOrderIdRaw !== "string") {
    failShape("workOrderId must be a string or null", "workOrderId")
  }
  const workOrderItemIdRaw = body.workOrderItemId
  if (workOrderItemIdRaw !== null && typeof workOrderItemIdRaw !== "string") {
    failShape("workOrderItemId must be a string or null", "workOrderItemId")
  }
  return {
    cutLogId: cutLogIdRaw as string,
    workOrderId: (workOrderIdRaw as string | null) ?? null,
    workOrderItemId: (workOrderItemIdRaw as string | null) ?? null,
  }
}
