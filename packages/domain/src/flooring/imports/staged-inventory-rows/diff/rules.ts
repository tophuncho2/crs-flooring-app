import type {
  DiffExistingStagedInventoryRow,
  DiffStagedLocationLookup,
  StagedInventoryDiffValidationIssue,
  StagedInventoryParentContext,
  StagedInventoryRowsDiff,
} from "./types.js"

type ProjectedRow = {
  origin: "existing" | "modified" | "added"
  id: string | null
  tempId: string | null
  productId: string
  itemNumber: string
  locationId: string | null
  warehouseId: string
}

function projectPostDiffRows(
  diff: StagedInventoryRowsDiff,
  existing: DiffExistingStagedInventoryRow[],
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
        productId: mod.patch.productId ?? row.productId,
        itemNumber: mod.patch.itemNumber ?? row.itemNumber,
        locationId: mod.patch.locationId !== undefined ? mod.patch.locationId : row.locationId,
        warehouseId: mod.patch.warehouseId ?? row.warehouseId,
      })
    } else {
      projected.push({
        origin: "existing",
        id: row.id,
        tempId: null,
        productId: row.productId,
        itemNumber: row.itemNumber,
        locationId: row.locationId,
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
      itemNumber: draft.itemNumber,
      locationId: draft.locationId,
      warehouseId: draft.warehouseId,
    })
  }

  return projected
}

function findLocationWarehouseMismatches(
  rows: ProjectedRow[],
  locationIndex: Map<string, DiffStagedLocationLookup>,
): StagedInventoryDiffValidationIssue[] {
  const issues: StagedInventoryDiffValidationIssue[] = []
  for (const row of rows) {
    if (!row.locationId) continue
    const location = locationIndex.get(row.locationId)
    if (!location) {
      issues.push({
        code: "STAGED_UNKNOWN_LOCATION",
        locationId: row.locationId,
        rowId: row.id,
        rowTempId: row.tempId,
      })
      continue
    }
    if (location.warehouseId !== row.warehouseId) {
      issues.push({
        code: "STAGED_LOCATION_WAREHOUSE_MISMATCH",
        locationId: row.locationId,
        expectedWarehouseId: row.warehouseId,
        rowId: row.id,
        rowTempId: row.tempId,
      })
    }
  }
  return issues
}

function findImportWarehouseMismatches(
  rows: ProjectedRow[],
  parent: StagedInventoryParentContext,
): StagedInventoryDiffValidationIssue[] {
  const issues: StagedInventoryDiffValidationIssue[] = []
  for (const row of rows) {
    if (row.origin === "existing") continue
    if (row.warehouseId !== parent.warehouseId) {
      issues.push({
        code: "STAGED_IMPORT_WAREHOUSE_MISMATCH",
        expectedWarehouseId: parent.warehouseId,
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
): StagedInventoryDiffValidationIssue[] {
  const issues: StagedInventoryDiffValidationIssue[] = []
  for (const row of rows) {
    if (row.origin === "existing") continue
    if (!knownProductIds.has(row.productId)) {
      issues.push({
        code: "STAGED_UNKNOWN_PRODUCT",
        productId: row.productId,
        rowId: row.id,
        rowTempId: row.tempId,
      })
    }
  }
  return issues
}

function findLockedRowEdits(
  diff: StagedInventoryRowsDiff,
  existing: DiffExistingStagedInventoryRow[],
): StagedInventoryDiffValidationIssue[] {
  const issues: StagedInventoryDiffValidationIssue[] = []
  const existingById = new Map(existing.map((row) => [row.id, row]))
  for (const update of diff.modified) {
    const row = existingById.get(update.id)
    if (row?.isImported) {
      issues.push({
        code: "STAGED_ROW_LOCKED_POST_IMPORT",
        rowId: update.id,
        attemptedAction: "modify",
      })
    }
  }
  for (const entry of diff.deleted) {
    const row = existingById.get(entry.id)
    if (row?.isImported) {
      issues.push({
        code: "STAGED_ROW_LOCKED_POST_IMPORT",
        rowId: entry.id,
        attemptedAction: "delete",
      })
    }
  }
  return issues
}

export type StagedInventoryDiffResolution = {
  existing: DiffExistingStagedInventoryRow[]
  locations: DiffStagedLocationLookup[]
  knownProductIds: string[]
}

export function validateStagedInventoryRowsDiff(
  diff: StagedInventoryRowsDiff,
  resolution: StagedInventoryDiffResolution,
  parent: StagedInventoryParentContext,
): StagedInventoryDiffValidationIssue[] {
  const locationIndex = new Map(resolution.locations.map((l) => [l.id, l]))
  const knownProductIds = new Set(resolution.knownProductIds)
  const projected = projectPostDiffRows(diff, resolution.existing)
  return [
    ...findLocationWarehouseMismatches(projected, locationIndex),
    ...findImportWarehouseMismatches(projected, parent),
    ...findUnknownProducts(projected, knownProductIds),
    ...findLockedRowEdits(diff, resolution.existing),
  ]
}
