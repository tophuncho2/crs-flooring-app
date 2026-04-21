export type InventoryRowDraft = {
  tempId: string
  productId: string
  itemNumber: string
  dyeLot: string | null
  warehouseId: string | null
  locationId: string | null
  stockCount: string
  cost: string | null
  freight: string | null
  notes: string | null
  isImported?: boolean
}

export type InventoryRowUpdatePatch = {
  productId?: string
  itemNumber?: string
  dyeLot?: string | null
  warehouseId?: string | null
  locationId?: string | null
  stockCount?: string
  cost?: string | null
  freight?: string | null
  notes?: string | null
  isImported?: boolean
}

export type InventoryRowUpdate = {
  id: string
  expectedUpdatedAt: string
  patch: InventoryRowUpdatePatch
}

export type InventoryRowDelete = {
  id: string
  expectedUpdatedAt: string
}

export type InventoryRowsDiff = {
  added: InventoryRowDraft[]
  modified: InventoryRowUpdate[]
  deleted: InventoryRowDelete[]
}

export type InventoryParentContext =
  | { kind: "import"; importEntryId: string; warehouseId: string | null }

export type DiffExistingInventoryRow = {
  id: string
  productId: string
  itemNumber: string
  locationId: string | null
  warehouseId: string | null
  cutLogsCount: number
  isImported: boolean
}

export type DiffLocationLookup = {
  id: string
  warehouseId: string
}

export type InventoryDiffValidationIssue =
  | {
      code: "DUPLICATE_ITEM_NUMBER_PER_LOCATION"
      itemNumber: string
      locationId: string | null
      offendingIds: string[]
      offendingTempIds: string[]
    }
  | {
      code: "LOCATION_WAREHOUSE_MISMATCH"
      locationId: string
      expectedWarehouseId: string
      rowId: string | null
      rowTempId: string | null
    }
  | {
      code: "IMPORT_WAREHOUSE_MISMATCH"
      expectedWarehouseId: string | null
      rowWarehouseId: string | null
      rowId: string | null
      rowTempId: string | null
    }
  | {
      code: "UNKNOWN_PRODUCT"
      productId: string
      rowId: string | null
      rowTempId: string | null
    }
  | {
      code: "UNKNOWN_LOCATION"
      locationId: string
      rowId: string | null
      rowTempId: string | null
    }
  | {
      code: "DELETE_BLOCKED_BY_CUT_LOGS"
      rowId: string
      cutLogsCount: number
    }
  | {
      code: "IMPORTED_REVERSAL_NOT_ALLOWED"
      rowId: string
    }

export function describeInventoryDiffIssue(issue: InventoryDiffValidationIssue): string {
  switch (issue.code) {
    case "DUPLICATE_ITEM_NUMBER_PER_LOCATION":
      return `Item # "${issue.itemNumber}" is used more than once at the same location. Each item # must be unique per location.`
    case "LOCATION_WAREHOUSE_MISMATCH":
      return `The selected location does not belong to the chosen warehouse.`
    case "IMPORT_WAREHOUSE_MISMATCH":
      return `Inventory rows must stay within the import's warehouse.`
    case "UNKNOWN_PRODUCT":
      return `Referenced product ${issue.productId} does not exist.`
    case "UNKNOWN_LOCATION":
      return `Referenced location ${issue.locationId} does not exist.`
    case "DELETE_BLOCKED_BY_CUT_LOGS":
      return `Cannot delete inventory row with ${issue.cutLogsCount} cut log${issue.cutLogsCount === 1 ? "" : "s"} attached.`
    case "IMPORTED_REVERSAL_NOT_ALLOWED":
      return `Inventory row is already imported and cannot return to pending.`
  }
}

export function describeInventoryDiffIssues(issues: InventoryDiffValidationIssue[]): string {
  return issues.map(describeInventoryDiffIssue).join(" ")
}

type ProjectedRow = {
  origin: "existing" | "modified" | "added"
  id: string | null
  tempId: string | null
  productId: string
  itemNumber: string
  locationId: string | null
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
        productId: mod.patch.productId ?? row.productId,
        itemNumber: mod.patch.itemNumber ?? row.itemNumber,
        locationId: mod.patch.locationId !== undefined ? mod.patch.locationId : row.locationId,
        warehouseId: mod.patch.warehouseId !== undefined ? mod.patch.warehouseId : row.warehouseId,
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

function findDuplicateItemNumbers(rows: ProjectedRow[]): InventoryDiffValidationIssue[] {
  const issues: InventoryDiffValidationIssue[] = []
  const groups = new Map<string, ProjectedRow[]>()
  for (const row of rows) {
    const key = `${row.locationId ?? "∅"}::${row.itemNumber}`
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }
  for (const list of groups.values()) {
    if (list.length <= 1) continue
    issues.push({
      code: "DUPLICATE_ITEM_NUMBER_PER_LOCATION",
      itemNumber: list[0].itemNumber,
      locationId: list[0].locationId,
      offendingIds: list.map((r) => r.id).filter((id): id is string => id !== null),
      offendingTempIds: list.map((r) => r.tempId).filter((t): t is string => t !== null),
    })
  }
  return issues
}

function findLocationWarehouseMismatches(
  rows: ProjectedRow[],
  locationIndex: Map<string, DiffLocationLookup>,
): InventoryDiffValidationIssue[] {
  const issues: InventoryDiffValidationIssue[] = []
  for (const row of rows) {
    if (!row.locationId) continue
    const location = locationIndex.get(row.locationId)
    if (!location) {
      issues.push({
        code: "UNKNOWN_LOCATION",
        locationId: row.locationId,
        rowId: row.id,
        rowTempId: row.tempId,
      })
      continue
    }
    if (row.warehouseId && location.warehouseId !== row.warehouseId) {
      issues.push({
        code: "LOCATION_WAREHOUSE_MISMATCH",
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

function findImportedReversals(
  diff: InventoryRowsDiff,
  existing: DiffExistingInventoryRow[],
): InventoryDiffValidationIssue[] {
  const issues: InventoryDiffValidationIssue[] = []
  const existingById = new Map(existing.map((row) => [row.id, row]))
  for (const update of diff.modified) {
    if (update.patch.isImported === undefined) continue
    const row = existingById.get(update.id)
    if (!row) continue
    if (row.isImported === true && update.patch.isImported === false) {
      issues.push({
        code: "IMPORTED_REVERSAL_NOT_ALLOWED",
        rowId: update.id,
      })
    }
  }
  return issues
}

export type InventoryDiffResolution = {
  existing: DiffExistingInventoryRow[]
  locations: DiffLocationLookup[]
  knownProductIds: string[]
}

export function validateInventoryRowsDiff(
  diff: InventoryRowsDiff,
  resolution: InventoryDiffResolution,
  parentContext: InventoryParentContext,
): InventoryDiffValidationIssue[] {
  const locationIndex = new Map(resolution.locations.map((l) => [l.id, l]))
  const knownProductIds = new Set(resolution.knownProductIds)
  const projected = projectPostDiffRows(diff, resolution.existing)
  return [
    ...findDuplicateItemNumbers(projected),
    ...findLocationWarehouseMismatches(projected, locationIndex),
    ...findImportWarehouseMismatches(projected, parentContext),
    ...findUnknownProducts(projected, knownProductIds),
    ...findBlockedDeletes(diff, resolution.existing),
    ...findImportedReversals(diff, resolution.existing),
  ]
}
