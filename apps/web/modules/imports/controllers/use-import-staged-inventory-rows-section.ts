"use client"

import { useCallback, useState } from "react"
import {
  createLocalRecordRowId,
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordScopedSectionController,
} from "@/modules/shared/engines/record-view"
import { useGatedBatchSelect } from "@/controllers/record/use-gated-batch-select"
import { buildDuplicatedRow } from "@/components/features/duplicate-row"
import type {
  ImportDetail,
  ProductPickerOption,
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
import { useImportsListMutations } from "./use-imports-list-mutations"

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
    localRows.filter((row) => !isLocalOnlyRecordRow(row.clientId)).map((row) => row.clientId),
  )

  const added: StagedInventoryRowDraft[] = []
  const modified: StagedInventoryRowUpdate[] = []
  const deleted: StagedInventoryRowDelete[] = []

  for (const row of localRows) {
    if (isLocalOnlyRecordRow(row.clientId)) {
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
  productPickerOptionsByItemId,
  publishRecord,
  publishStagedRows,
  publishMarkedForImport,
}: {
  record: ImportDetail
  stagedRows: StagedInventoryRow[]
  locationOptions: LocationOption[]
  productPickerOptionsByItemId: Record<string, ProductPickerOption>
  publishRecord: (record: ImportDetail) => void
  publishStagedRows: (rows: StagedInventoryRow[]) => void
  /**
   * Optimistic-flip callback for the mark-for-import batch action. The
   * controller only sees the pending slice of staged rows; the parent
   * panel owns the full list and applies the status flip across both
   * pending and historical rows. Receives the ids the worker accepted.
   */
  publishMarkedForImport: (markedIds: string[]) => void
}) {
  const { updateStagedInventoryRows, markStagedRowsForImport } = useImportsListMutations()

  // Session-scoped record of the picker option currently shown for each row,
  // seeded from the SSR-hydrated map and keyed by clientId. Updated whenever
  // ProductPicker fires onSelectOption. Used for: parent-category trigger
  // label, starting-stock unit suffix, and category derivation when
  // categoryFilterId is null.
  const [selectedProductOptionByRowId, setSelectedProductOptionByRowId] = useState<
    Record<string, ProductPickerOption>
  >(() => ({ ...productPickerOptionsByItemId }))

  const setSelectedProductOption = useCallback(
    (rowId: string, option: ProductPickerOption | null) => {
      setSelectedProductOptionByRowId((previous) => {
        if (option === null) {
          if (!(rowId in previous)) return previous
          const next = { ...previous }
          delete next[rowId]
          return next
        }
        if (previous[rowId]?.id === option.id) return previous
        return { ...previous, [rowId]: option }
      })
    },
    [],
  )

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

      const response = await updateStagedInventoryRows.mutateAsync({
        importId: record.id,
        diff,
        revisionKey: record.updatedAt,
      })
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
    let removedClientId: string | null = null
    section.setLocalValue((previous) => {
      removedClientId = previous[index]?.clientId ?? null
      return previous.filter((_, rowIndex) => rowIndex !== index)
    })
    if (removedClientId) {
      const id = removedClientId
      setSelectedProductOptionByRowId((previous) => {
        if (!(id in previous)) return previous
        const next = { ...previous }
        delete next[id]
        return next
      })
    }
    if (section.error) {
      section.setError(null)
    }
  }

  function duplicateRow(index: number) {
    const newClientId = createLocalRecordRowId("import-staged-row")
    let copiedFromId: string | null = null
    section.setLocalValue((previous) => {
      const source = previous[index]
      if (!source) return previous
      copiedFromId = source.clientId
      // Copy productId + categoryFilterId so the new row's product picker is
      // pre-filtered to the same category. itemNumber, startingStock,
      // location, dyeLot, and notes start blank — the user must confirm the
      // per-row values for the new line.
      const duplicated: ImportStagedRowDraft = {
        clientId: newClientId,
        ...buildDuplicatedRow(
          {
            productId: source.productId,
            itemNumber: source.itemNumber,
            startingStock: source.startingStock,
            locationId: source.locationId,
            dyeLot: source.dyeLot,
            notes: source.notes,
            categoryFilterId: source.categoryFilterId,
          },
          {
            copy: ["productId", "categoryFilterId"],
            defaults: {
              productId: "",
              itemNumber: "",
              startingStock: "",
              locationId: "",
              dyeLot: "",
              notes: "",
              categoryFilterId: null,
            },
          },
        ),
      }
      const next = [...previous]
      next.splice(index + 1, 0, duplicated)
      return next
    })
    if (copiedFromId) {
      setSelectedProductOptionByRowId((previous) => {
        const sourceOption = previous[copiedFromId as string]
        if (!sourceOption) return previous
        return { ...previous, [newClientId]: sourceOption }
      })
    }
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
   * save payload. Used to narrow the product picker's server-side query.
   * Changing the category clears the picked product — the previously-picked
   * product may not exist in the new category's option set, and the async
   * picker won't surface it for re-selection until the user broadens the
   * filter again.
   */
  function setRowCategoryFilter(index: number, categoryId: string | null) {
    let clearedClientId: string | null = null
    section.setLocalValue((previous) =>
      previous.map((row, rowIndex) => {
        if (rowIndex !== index) return row
        if (row.categoryFilterId === categoryId) return row
        clearedClientId = row.clientId
        return { ...row, categoryFilterId: categoryId, productId: "" }
      }),
    )
    if (clearedClientId) {
      const id = clearedClientId
      setSelectedProductOptionByRowId((previous) => {
        if (!(id in previous)) return previous
        const next = { ...previous }
        delete next[id]
        return next
      })
    }
    if (section.error) {
      section.setError(null)
    }
  }

  function handleWarehouseChange(nextWarehouseId: string) {
    section.setLocalValue((previous) =>
      previous.map((row) => applyDefaultLocationToImportRow(row, nextWarehouseId, locationOptions)),
    )
  }

  // Mark-for-import batch action. Eligibility = persisted server row that's
  // still DRAFT with a product + starting stock. `useGatedBatchSelect` wraps
  // the underlying `useBatchSelectAction` primitive with section-aware
  // gating: `canToggleSelection` is false while the section is dirty
  // (preventing users from marking rows for import while abandoning unsaved
  // edits) and `isSelectionActive` flags the section for read-only edit-lock
  // while a batch is being prepared. Optimistic flip on success preserves
  // unsaved edits in other rows (row count + parent.updatedAt unchanged →
  // engine revisionKey stays stable).
  const markForImport = useGatedBatchSelect({
    rows: stagedRows,
    isEligible: (row) => {
      if (row.status !== "DRAFT") return false
      if (!row.productId) return false
      if (!row.startingStock) return false
      return true
    },
    performAction: useCallback(
      async (ids) => {
        const result = await markStagedRowsForImport.mutateAsync({
          importId: record.id,
          stagedRowIds: ids,
        })
        publishMarkedForImport(result.batch.markedRowIds)
      },
      [markStagedRowsForImport, record.id, publishMarkedForImport],
    ),
    isSectionDirty: section.isDirty,
    isSectionBusy: section.isSaving,
  })

  return {
    ...section,
    addRow,
    removeRow,
    duplicateRow,
    setRowField,
    setRowCategoryFilter,
    handleWarehouseChange,
    selectedProductOptionByRowId,
    setSelectedProductOption,
    selectedIds: markForImport.selectedIds,
    toggleSelection: markForImport.toggleSelected,
    clearSelection: markForImport.clearSelection,
    eligibleSelectedIds: markForImport.eligibleSelectedIds,
    isMarking: markForImport.isFiring,
    markError: markForImport.error,
    markForImport: markForImport.fire,
    isSelectionActive: markForImport.isSelectionActive,
    canToggleSelection: markForImport.canToggleSelection,
    eligibleCount: markForImport.eligibleCount,
    toggleAllEligible: markForImport.toggleAllEligible,
  }
}
