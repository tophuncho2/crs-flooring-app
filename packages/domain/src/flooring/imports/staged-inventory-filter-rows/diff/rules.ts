import type {
  DiffExistingStagedInventoryFilterRow,
  StagedInventoryFilterDiffValidationIssue,
  StagedInventoryFiltersDiff,
} from "./types.js"
import type {
  DiffExistingStagedInventoryRow,
  StagedInventoryRowsDiff,
} from "../../staged-inventory-rows/diff/types.js"

type ProjectedRow = {
  origin: "existing" | "modified" | "added"
  id: string | null
  tempId: string | null
  productId: string
}

function projectPostDiffRows(
  diff: StagedInventoryFiltersDiff,
  existing: DiffExistingStagedInventoryFilterRow[],
): ProjectedRow[] {
  const deletedIds = new Set(diff.deleted.map((d) => d.id))
  const modifiedById = new Map(diff.modified.map((m) => [m.id, m]))

  const projected: ProjectedRow[] = []

  for (const row of existing) {
    if (deletedIds.has(row.id)) continue
    const mod = modifiedById.get(row.id)
    if (mod) {
      projected.push({
        origin: "modified",
        id: row.id,
        tempId: null,
        productId: mod.form.productId,
      })
    } else {
      projected.push({
        origin: "existing",
        id: row.id,
        tempId: null,
        productId: row.productId,
      })
    }
  }

  for (const draft of diff.added) {
    projected.push({
      origin: "added",
      id: null,
      tempId: draft.tempId,
      productId: draft.form.productId,
    })
  }

  return projected
}

function findDuplicateProducts(
  rows: ProjectedRow[],
): StagedInventoryFilterDiffValidationIssue[] {
  const issues: StagedInventoryFilterDiffValidationIssue[] = []
  const seenProductIds = new Set<string>()
  for (const row of rows) {
    if (!row.productId) continue
    if (seenProductIds.has(row.productId)) {
      issues.push({
        code: "FILTER_DUPLICATE_PRODUCT",
        productId: row.productId,
        rowId: row.id,
        rowTempId: row.tempId,
      })
    } else {
      seenProductIds.add(row.productId)
    }
  }
  return issues
}

function findUnknownProducts(
  rows: ProjectedRow[],
  knownProductIds: Set<string>,
): StagedInventoryFilterDiffValidationIssue[] {
  const issues: StagedInventoryFilterDiffValidationIssue[] = []
  for (const row of rows) {
    if (row.origin === "existing") continue
    if (!row.productId) continue
    if (!knownProductIds.has(row.productId)) {
      issues.push({
        code: "FILTER_UNKNOWN_PRODUCT",
        productId: row.productId,
        rowId: row.id,
        rowTempId: row.tempId,
      })
    }
  }
  return issues
}

/**
 * The category filter is immutable once the row is saved. Unlike
 * `FILTER_PRODUCT_LOCKED_WITH_CHILDREN`, there's no `hasChildren`
 * carve-out — any change on a `modified` row is a rule violation.
 * Local-only `added` rows are unaffected (they have no existing
 * server snapshot to compare against).
 */
function findLockedCategoryFilterChanges(
  diff: StagedInventoryFiltersDiff,
  existing: DiffExistingStagedInventoryFilterRow[],
): StagedInventoryFilterDiffValidationIssue[] {
  const issues: StagedInventoryFilterDiffValidationIssue[] = []
  const existingById = new Map(existing.map((row) => [row.id, row]))
  for (const update of diff.modified) {
    const row = existingById.get(update.id)
    if (!row) continue
    if (update.form.categoryFilterId !== row.categoryFilterId) {
      issues.push({
        code: "FILTER_CATEGORY_FILTER_LOCKED_AFTER_CREATE",
        rowId: update.id,
      })
    }
  }
  return issues
}

function findDeletesBlockedByChildren(
  diff: StagedInventoryFiltersDiff,
  existing: DiffExistingStagedInventoryFilterRow[],
  stagedRowsDiff: StagedInventoryRowsDiff,
  existingStagedRows: DiffExistingStagedInventoryRow[],
): StagedInventoryFilterDiffValidationIssue[] {
  const issues: StagedInventoryFilterDiffValidationIssue[] = []
  const existingById = new Map(existing.map((row) => [row.id, row]))

  // Build the post-diff child set per filter row: existing children
  // minus those being deleted in the same save. A filter row's delete is
  // unblocked iff its post-diff child set is empty.
  const stagedDeletedIds = new Set(stagedRowsDiff.deleted.map((r) => r.id))
  const postDiffChildCountByFilterId = new Map<string, number>()
  for (const row of existingStagedRows) {
    if (stagedDeletedIds.has(row.id)) continue
    postDiffChildCountByFilterId.set(
      row.filterRowId,
      (postDiffChildCountByFilterId.get(row.filterRowId) ?? 0) + 1,
    )
  }

  for (const entry of diff.deleted) {
    const row = existingById.get(entry.id)
    if (!row?.hasChildren) continue
    const postDiffChildren = postDiffChildCountByFilterId.get(entry.id) ?? 0
    if (postDiffChildren > 0) {
      issues.push({
        code: "FILTER_DELETE_BLOCKED_BY_CHILDREN",
        rowId: entry.id,
      })
    }
  }
  return issues
}

function findLockedProductChangesPostDiff(
  diff: StagedInventoryFiltersDiff,
  existing: DiffExistingStagedInventoryFilterRow[],
  stagedRowsDiff: StagedInventoryRowsDiff,
  existingStagedRows: DiffExistingStagedInventoryRow[],
): StagedInventoryFilterDiffValidationIssue[] {
  // The original `findLockedProductChanges` rejects changing
  // `productId` on any modified filter row that has children. That
  // remains correct iff the row will still have children after the
  // staged-rows diff applies. If every existing child is in
  // `stagedRowsDiff.deleted`, the change should be allowed (the row
  // becomes effectively childless in the same transaction).
  const issues: StagedInventoryFilterDiffValidationIssue[] = []
  const existingById = new Map(existing.map((row) => [row.id, row]))
  const stagedDeletedIds = new Set(stagedRowsDiff.deleted.map((r) => r.id))
  const postDiffChildCountByFilterId = new Map<string, number>()
  for (const row of existingStagedRows) {
    if (stagedDeletedIds.has(row.id)) continue
    postDiffChildCountByFilterId.set(
      row.filterRowId,
      (postDiffChildCountByFilterId.get(row.filterRowId) ?? 0) + 1,
    )
  }

  for (const update of diff.modified) {
    const row = existingById.get(update.id)
    if (!row) continue
    if (update.form.productId === row.productId) continue
    const postDiffChildren = postDiffChildCountByFilterId.get(update.id) ?? 0
    if (postDiffChildren > 0) {
      issues.push({
        code: "FILTER_PRODUCT_LOCKED_WITH_CHILDREN",
        rowId: update.id,
      })
    }
  }
  return issues
}

export type StagedInventoryFilterDiffResolution = {
  existing: DiffExistingStagedInventoryFilterRow[]
  knownProductIds: string[]
  /**
   * Optional cross-slice context — when present, locked-with-children
   * and delete-blocked-by-children rules become post-diff aware (a child
   * being deleted in the same save no longer counts against its parent).
   * Omitted by callers that validate the filter-rows slice in isolation
   * (e.g. older single-section saves) — falls back to existing-only.
   */
  stagedRows?: {
    diff: StagedInventoryRowsDiff
    existing: DiffExistingStagedInventoryRow[]
  }
}

export function validateStagedInventoryFiltersDiff(
  diff: StagedInventoryFiltersDiff,
  resolution: StagedInventoryFilterDiffResolution,
): StagedInventoryFilterDiffValidationIssue[] {
  const knownProductIds = new Set(resolution.knownProductIds)
  const projected = projectPostDiffRows(diff, resolution.existing)
  const stagedDiff: StagedInventoryRowsDiff = resolution.stagedRows?.diff ?? {
    added: [],
    modified: [],
    deleted: [],
  }
  const stagedExisting: DiffExistingStagedInventoryRow[] =
    resolution.stagedRows?.existing ?? []
  return [
    ...findDuplicateProducts(projected),
    ...findUnknownProducts(projected, knownProductIds),
    ...findLockedProductChangesPostDiff(diff, resolution.existing, stagedDiff, stagedExisting),
    ...findLockedCategoryFilterChanges(diff, resolution.existing),
    ...findDeletesBlockedByChildren(diff, resolution.existing, stagedDiff, stagedExisting),
  ]
}
