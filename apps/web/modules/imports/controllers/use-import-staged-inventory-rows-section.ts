"use client"

import { useCallback, useMemo, useState } from "react"
import {
  createLocalRecordRowId,
  createRecordSectionError,
  useRecordScopedSectionController,
} from "@/modules/shared/engines/record-view"
import type {
  ImportDetail,
  StagedInventoryRow,
  StagedInventoryRowDraft,
  StagedInventoryRowDelete,
  StagedInventoryRowUpdate,
  StagedInventoryRowUpdatePatch,
  StagedInventoryRowsDiff,
} from "@builders/domain"
import {
  applyDefaultLocationToImportRow,
  createImportStagedRowDraft,
  toImportStagedRowDrafts,
  validateImportStagedRowDrafts,
  type ImportStagedRowDraft,
  type LocationOption,
} from "./drafts"
import {
  markStagedRowsForImportRequest,
  updateImportStagedInventoryRowsRequest,
} from "../data/mutations"

function createDraftRow(locationOptions: LocationOption[], warehouseId: string) {
  return applyDefaultLocationToImportRow(
    {
      ...createImportStagedRowDraft(),
      clientId: createLocalRecordRowId("import-staged-row"),
    },
    warehouseId,
    locationOptions,
  )
}

function isLocalDraftRow(row: ImportStagedRowDraft) {
  return row.clientId.startsWith("local:")
}

function createRowsRevisionKey(record: ImportDetail, rows: StagedInventoryRow[]) {
  return `${record.updatedAt}:${rows.length}`
}

function toDraftPayload(
  row: ImportStagedRowDraft,
  importWarehouseId: string,
): StagedInventoryRowDraft {
  return {
    tempId: row.clientId,
    productId: row.productId,
    itemNumber: row.itemNumber,
    dyeLot: row.dyeLot || null,
    // Validator requires warehouseId on each draft. The use case re-resolves
    // from the location's warehouseId at write time; the parent import's
    // warehouseId is the canonical scope.
    warehouseId: importWarehouseId,
    locationId: row.locationId || null,
    startingStock: row.startingStock,
    cost: row.cost || null,
    freight: row.freight || null,
    notes: row.notes || null,
  }
}

function toUpdatePatch(
  row: ImportStagedRowDraft,
  existing: StagedInventoryRow,
): StagedInventoryRowUpdatePatch {
  const patch: StagedInventoryRowUpdatePatch = {}
  if (row.productId !== existing.productId) patch.productId = row.productId
  if (row.itemNumber !== existing.itemNumber) patch.itemNumber = row.itemNumber
  if ((row.dyeLot || null) !== (existing.dyeLot || null)) patch.dyeLot = row.dyeLot || null
  if ((row.locationId || null) !== (existing.locationId || null)) {
    patch.locationId = row.locationId || null
  }
  if (row.startingStock !== existing.startingStock) patch.startingStock = row.startingStock
  if ((row.cost || null) !== (existing.cost || null)) patch.cost = row.cost || null
  if ((row.freight || null) !== (existing.freight || null)) patch.freight = row.freight || null
  if ((row.notes || null) !== (existing.notes || null)) patch.notes = row.notes || null
  return patch
}

function buildStagedInventoryRowsDiff(
  localRows: ImportStagedRowDraft[],
  serverRows: StagedInventoryRow[],
  importWarehouseId: string,
): StagedInventoryRowsDiff {
  const serverById = new Map(serverRows.map((row) => [row.id, row]))
  const localServerIds = new Set(
    localRows.filter((row) => !isLocalDraftRow(row)).map((row) => row.clientId),
  )

  const added: StagedInventoryRowDraft[] = []
  const modified: StagedInventoryRowUpdate[] = []
  const deleted: StagedInventoryRowDelete[] = []

  for (const row of localRows) {
    if (isLocalDraftRow(row)) {
      added.push(toDraftPayload(row, importWarehouseId))
      continue
    }
    const existing = serverById.get(row.clientId)
    if (!existing) {
      // Drift (client references a server id that no longer exists) — treat as add.
      added.push(toDraftPayload(row, importWarehouseId))
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

export function useImportStagedInventoryRowsSection({
  record,
  stagedRows,
  locationOptions,
  publishRecord,
  publishStagedRows,
}: {
  record: ImportDetail
  stagedRows: StagedInventoryRow[]
  locationOptions: LocationOption[]
  publishRecord: (record: ImportDetail) => void
  publishStagedRows: (rows: StagedInventoryRow[]) => void
}) {
  const section = useRecordScopedSectionController<StagedInventoryRow[], ImportStagedRowDraft[]>({
    recordId: record.id,
    sectionKey: "staged-inventory-rows",
    serverValue: stagedRows,
    serverRevisionKey: createRowsRevisionKey(record, stagedRows),
    createLocalValue: toImportStagedRowDrafts,
    persistDraft: false,
    policy: {
      addRowPlacement: "top",
      childRows: "none",
    },
    onSave: async (localValue, currentServerRows) => {
      const validationError = validateImportStagedRowDrafts(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const diff = buildStagedInventoryRowsDiff(
        localValue,
        currentServerRows,
        record.warehouseId,
      )
      if (diff.added.length === 0 && diff.modified.length === 0 && diff.deleted.length === 0) {
        return {
          serverValue: currentServerRows,
          serverRevisionKey: createRowsRevisionKey(record, currentServerRows),
          noticeMessage: "No changes to save",
        }
      }

      const response = await updateImportStagedInventoryRowsRequest(
        record.id,
        diff,
        record.updatedAt,
      )
      publishRecord(response.import)
      publishStagedRows(response.stagedRows)

      return {
        serverValue: response.stagedRows,
        serverRevisionKey: createRowsRevisionKey(response.import, response.stagedRows),
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
    field: Exclude<keyof Omit<ImportStagedRowDraft, "clientId">, "categoryFilterId">,
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

  /**
   * Set the row's category filter. Client-only state; does NOT flow into the
   * save payload. Used to narrow the product dropdown. Passing `null` clears
   * the filter. Does NOT auto-clear the row's productId — the saved product
   * is preserved across filter changes (section UI re-includes it in the
   * product option list even when it doesn't match the filter).
   */
  function setRowCategoryFilter(index: number, categoryId: string | null) {
    section.setLocalValue((previous) =>
      previous.map((row, rowIndex) =>
        rowIndex === index ? { ...row, categoryFilterId: categoryId } : row,
      ),
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

  // Selection state for the mark-for-import flow. Keys are server row ids
  // (a.k.a. clientId on saved drafts). Locally-added drafts are not selectable
  // — they have no server id and the worker only consumes persisted rows.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isMarking, setIsMarking] = useState(false)
  const [markError, setMarkError] = useState<string | null>(null)

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Eligibility = persisted server row that's still DRAFT and has product +
  // starting stock. Mirrors the server's batch validator at the producer use
  // case; the server is authoritative — this is just for the Run Import button
  // gating.
  const eligibleSelectedIds = useMemo(() => {
    const serverRowsById = new Map(stagedRows.map((row) => [row.id, row]))
    return Array.from(selectedIds).filter((id) => {
      const row = serverRowsById.get(id)
      if (!row) return false
      if (row.status !== "DRAFT") return false
      if (!row.productId) return false
      if (!row.startingStock) return false
      return true
    })
  }, [selectedIds, stagedRows])

  const markForImport = useCallback(async () => {
    if (eligibleSelectedIds.length === 0) return
    setIsMarking(true)
    setMarkError(null)
    try {
      const ids = [...eligibleSelectedIds]
      const result = await markStagedRowsForImportRequest(record.id, ids)
      const markedSet = new Set(result.batch.markedRowIds)
      // Optimistic flip: row count and parent.updatedAt unchanged, so the
      // engine controller's revisionKey stays stable and any other rows'
      // unsaved edits are preserved.
      publishStagedRows(
        stagedRows.map((row) =>
          markedSet.has(row.id) ? { ...row, status: "QUEUED" as const } : row,
        ),
      )
      setSelectedIds(new Set())
    } catch (error) {
      setMarkError(error instanceof Error ? error.message : "Failed to queue rows for import")
    } finally {
      setIsMarking(false)
    }
  }, [eligibleSelectedIds, record.id, stagedRows, publishStagedRows])

  return {
    ...section,
    addRow,
    removeRow,
    setRowField,
    setRowCategoryFilter,
    handleWarehouseChange,
    selectedIds,
    toggleSelection,
    clearSelection,
    eligibleSelectedIds,
    isMarking,
    markError,
    markForImport,
  }
}
