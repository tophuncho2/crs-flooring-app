"use client"

import {
  createLocalRecordRowId,
  createRecordSectionError,
  useRecordScopedSectionController,
} from "@/modules/shared/engines/record-view"
import type {
  ImportDetail as ImportRow,
  InventoryRowDraft,
  InventoryRowDelete,
  InventoryRowUpdate,
  InventoryRowUpdatePatch,
  InventoryRowsDiff,
} from "@builders/domain"
import {
  applyDefaultLocationToImportRow,
  createImportInventoryRowDraft,
  toImportInventoryDrafts,
  validateImportInventoryDrafts,
  type ImportInventoryRowDraft,
  type LocationOption,
} from "./drafts"
import { updateImportInventoryRowsRequest } from "../data/mutations"

function createDraftRow(locationOptions: LocationOption[], warehouseId: string) {
  return applyDefaultLocationToImportRow(
    {
      ...createImportInventoryRowDraft(),
      clientId: createLocalRecordRowId("import-inventory-row"),
    },
    warehouseId,
    locationOptions,
  )
}

function isLocalDraftRow(row: ImportInventoryRowDraft) {
  return row.clientId.startsWith("local:")
}

function createRowsRevisionKey(record: ImportRow) {
  return `${record.updatedAt}:${record.inventories.length}`
}

function toDraftPayload(row: ImportInventoryRowDraft): InventoryRowDraft {
  return {
    tempId: row.clientId,
    productId: row.productId,
    itemNumber: row.itemNumber,
    dyeLot: row.dyeLot || null,
    // warehouseId flows from the import's warehouseId via the use case's
    // source-of-truth stamping. The domain shape accepts null here; use case
    // re-resolves from the location's warehouseId at write time.
    warehouseId: null,
    locationId: row.locationId || null,
    stockCount: row.stockCount,
    cost: row.cost || null,
    freight: row.freight || null,
    notes: row.notes || null,
    isImported: row.isImported,
  }
}

function toUpdatePatch(
  row: ImportInventoryRowDraft,
  existing: ImportRow["inventories"][number],
): InventoryRowUpdatePatch {
  const patch: InventoryRowUpdatePatch = {}
  if (row.productId !== existing.productId) patch.productId = row.productId
  if (row.itemNumber !== existing.itemNumber) patch.itemNumber = row.itemNumber
  if ((row.dyeLot || null) !== (existing.dyeLot || null)) patch.dyeLot = row.dyeLot || null
  if ((row.locationId || null) !== (existing.locationId || null)) {
    patch.locationId = row.locationId || null
  }
  if (row.stockCount !== existing.stockCount) patch.stockCount = row.stockCount
  if ((row.cost || null) !== (existing.cost || null)) patch.cost = row.cost || null
  if ((row.freight || null) !== (existing.freight || null)) patch.freight = row.freight || null
  if ((row.notes || null) !== (existing.notes || null)) patch.notes = row.notes || null
  if (row.isImported !== existing.isImported) patch.isImported = row.isImported
  return patch
}

function buildInventoryRowsDiff(
  localRows: ImportInventoryRowDraft[],
  serverRows: ImportRow["inventories"],
): InventoryRowsDiff {
  const serverById = new Map(serverRows.map((row) => [row.id, row]))
  const localServerIds = new Set(
    localRows.filter((row) => !isLocalDraftRow(row)).map((row) => row.clientId),
  )

  const added: InventoryRowDraft[] = []
  const modified: InventoryRowUpdate[] = []
  const deleted: InventoryRowDelete[] = []

  for (const row of localRows) {
    if (isLocalDraftRow(row)) {
      added.push(toDraftPayload(row))
      continue
    }
    const existing = serverById.get(row.clientId)
    if (!existing) {
      // Drift (client references a server id that no longer exists) — treat as add.
      added.push(toDraftPayload(row))
      continue
    }
    const patch = toUpdatePatch(row, existing)
    if (Object.keys(patch).length > 0) {
      modified.push({
        id: existing.id,
        expectedUpdatedAt: existing.updatedAt,
        patch,
      })
    }
  }

  for (const serverRow of serverRows) {
    if (!localServerIds.has(serverRow.id)) {
      deleted.push({
        id: serverRow.id,
        expectedUpdatedAt: serverRow.updatedAt,
      })
    }
  }

  return { added, modified, deleted }
}

function reconcileTempIds(
  localRows: ImportInventoryRowDraft[],
  tempIdMap: Record<string, string>,
): ImportInventoryRowDraft[] {
  return localRows.map((row) => {
    if (!isLocalDraftRow(row)) return row
    const realId = tempIdMap[row.clientId]
    return realId ? { ...row, clientId: realId } : row
  })
}

export function useImportInventoryRowsSection({
  record,
  locationOptions,
  publishRecord,
}: {
  record: ImportRow
  locationOptions: LocationOption[]
  publishRecord: (record: ImportRow) => void
}) {
  const section = useRecordScopedSectionController<ImportRow, ImportInventoryRowDraft[]>({
    recordId: record.id,
    sectionKey: "inventory-rows",
    serverValue: record,
    serverRevisionKey: createRowsRevisionKey(record),
    createLocalValue: toImportInventoryDrafts,
    persistDraft: false,
    policy: {
      addRowPlacement: "top",
      childRows: "none",
    },
    onSave: async (localValue, currentRecord) => {
      const validationError = validateImportInventoryDrafts(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const diff = buildInventoryRowsDiff(localValue, currentRecord.inventories)
      if (diff.added.length === 0 && diff.modified.length === 0 && diff.deleted.length === 0) {
        return {
          serverValue: currentRecord,
          serverRevisionKey: createRowsRevisionKey(currentRecord),
          noticeMessage: "No changes to save",
        }
      }

      const response = await updateImportInventoryRowsRequest(
        currentRecord.id,
        diff,
        currentRecord.updatedAt,
      )
      publishRecord(response.import)

      const reconciledLocal = reconcileTempIds(localValue, response.tempIdMap)
      return {
        serverValue: response.import,
        serverRevisionKey: createRowsRevisionKey(response.import),
        localValue: reconciledLocal,
        noticeMessage: "Import inventory rows saved",
      }
    },
  })

  function addRow() {
    section.setLocalValue((previous) => [
      createDraftRow(locationOptions, record.warehouseId),
      ...previous,
    ])
    if (section.error) {
      section.setError(null)
    }
  }

  function removeRow(index: number) {
    section.setLocalValue((previous) => previous.filter((_, rowIndex) => rowIndex !== index))
    if (section.error) {
      section.setError(null)
    }
  }

  function setRowField(
    index: number,
    field: Exclude<keyof Omit<ImportInventoryRowDraft, "clientId">, "isImported">,
    value: string,
  ) {
    section.setLocalValue((previous) =>
      previous.map((row, rowIndex) => {
        if (rowIndex !== index) return row
        return { ...row, [field]: value }
      }),
    )
    if (section.error) {
      section.setError(null)
    }
  }

  function setRowImportStatus(index: number, isImported: boolean) {
    section.setLocalValue((previous) =>
      previous.map((row, rowIndex) => (rowIndex === index ? { ...row, isImported } : row)),
    )
    if (section.error) {
      section.setError(null)
    }
  }

  function handleWarehouseChange(nextWarehouseId: string) {
    section.setLocalValue((previous) =>
      previous.map((row) => applyDefaultLocationToImportRow(row, nextWarehouseId, locationOptions)),
    )
  }

  return {
    ...section,
    addRow,
    removeRow,
    setRowField,
    setRowImportStatus,
    handleWarehouseChange,
  }
}
