import type {
  DiffExistingInventoryRow,
  InventoryDiffValidationIssue,
  InventoryParentContext,
  InventoryRowsDiff,
} from "./types.js"

type ProjectedRow = {
  origin: "existing" | "modified" | "added"
  id: string | null
  tempId: string | null
  productId: string
  rollNumber: string
  warehouseId: string | null
}

function projectPostDiffRows(
  diff: InventoryRowsDiff,
  existing: DiffExistingInventoryRow[],
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
        productId: row.productId,
        rollNumber: mod.patch.rollNumber ?? row.rollNumber,
        warehouseId: mod.patch.warehouseId !== undefined ? mod.patch.warehouseId : row.warehouseId,
      })
    } else {
      projected.push({
        origin: "existing",
        id: row.id,
        tempId: null,
        productId: row.productId,
        rollNumber: row.rollNumber,
        warehouseId: row.warehouseId,
      })
    }
  }

  for (const draft of diff.added) {
    projected.push({
      origin: "added",
      id: null,
      tempId: draft.tempId,
      productId: draft.productId,
      rollNumber: draft.rollNumber,
      warehouseId: draft.warehouseId,
    })
  }

  return projected
}

function findImportWarehouseMismatches(
  rows: ProjectedRow[],
  parentContext: InventoryParentContext,
): InventoryDiffValidationIssue[] {
  if (parentContext.kind !== "import") return []
  const expected = parentContext.warehouseId
  if (!expected) return []
  const issues: InventoryDiffValidationIssue[] = []
  for (const row of rows) {
    if (row.origin === "existing") continue
    if (row.warehouseId && row.warehouseId !== expected) {
      issues.push({
        code: "IMPORT_WAREHOUSE_MISMATCH",
        expectedWarehouseId: expected,
        rowWarehouseId: row.warehouseId,
        rowId: row.id,
        rowTempId: row.tempId,
      })
    }
  }
  return issues
}

function findUnknownProducts(
  rows: ProjectedRow[],
  knownProductIds: Set<string>,
): InventoryDiffValidationIssue[] {
  const issues: InventoryDiffValidationIssue[] = []
  for (const row of rows) {
    if (row.origin === "existing") continue
    if (!knownProductIds.has(row.productId)) {
      issues.push({
        code: "UNKNOWN_PRODUCT",
        productId: row.productId,
        rowId: row.id,
        rowTempId: row.tempId,
      })
    }
  }
  return issues
}

function findBlockedDeletes(
  diff: InventoryRowsDiff,
  existing: DiffExistingInventoryRow[],
): InventoryDiffValidationIssue[] {
  const issues: InventoryDiffValidationIssue[] = []
  const existingById = new Map(existing.map((row) => [row.id, row]))
  for (const entry of diff.deleted) {
    const row = existingById.get(entry.id)
    if (!row) continue
    if (row.cutLogsCount > 0) {
      issues.push({
        code: "DELETE_BLOCKED_BY_CUT_LOGS",
        rowId: entry.id,
        cutLogsCount: row.cutLogsCount,
      })
    }
  }
  return issues
}

export type InventoryDiffResolution = {
  existing: DiffExistingInventoryRow[]
  knownProductIds: string[]
}

export function validateInventoryRowsDiff(
  diff: InventoryRowsDiff,
  resolution: InventoryDiffResolution,
  parentContext: InventoryParentContext,
): InventoryDiffValidationIssue[] {
  const knownProductIds = new Set(resolution.knownProductIds)
  const projected = projectPostDiffRows(diff, resolution.existing)
  return [
    ...findImportWarehouseMismatches(projected, parentContext),
    ...findUnknownProducts(projected, knownProductIds),
    ...findBlockedDeletes(diff, resolution.existing),
  ]
}
