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
