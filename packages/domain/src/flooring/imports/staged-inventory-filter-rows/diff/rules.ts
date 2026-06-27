import type {
  DiffExistingStagedInventoryFilterRow,
  StagedInventoryFilterDiffValidationIssue,
  StagedInventoryFiltersDiff,
} from "./types.js"

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

export type StagedInventoryFilterDiffResolution = {
  existing: DiffExistingStagedInventoryFilterRow[]
  knownProductIds: string[]
}

export function validateStagedInventoryFiltersDiff(
  diff: StagedInventoryFiltersDiff,
  resolution: StagedInventoryFilterDiffResolution,
): StagedInventoryFilterDiffValidationIssue[] {
  const knownProductIds = new Set(resolution.knownProductIds)
  const projected = projectPostDiffRows(diff, resolution.existing)
  return [
    ...findDuplicateProducts(projected),
    ...findUnknownProducts(projected, knownProductIds),
    ...findLockedCategoryFilterChanges(diff, resolution.existing),
  ]
}
