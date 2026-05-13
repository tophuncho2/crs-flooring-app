"use client"

import { useCallback, useMemo } from "react"
import { useMutation } from "@tanstack/react-query"
import {
  createLocalRecordRowId,
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordScopedSectionController,
} from "@/modules/shared/engines/record-view"
import { useGatedBatchSelect } from "@/controllers/record/use-gated-batch-select"
import type {
  ImportDetail,
  ProductOption,
  StagedInventoryFilterRow,
  StagedInventoryFilterRowDelete,
  StagedInventoryFilterRowDraft,
  StagedInventoryFilterRowUpdate,
  StagedInventoryFiltersDiff,
  StagedInventoryRow,
} from "@builders/domain"
import {
  createImportFilterRowDraft,
  toImportFilterRowDrafts,
  validateImportFilterRowDrafts,
  type ImportFilterRowDraft,
} from "@/modules/imports/controllers/record/drafts"
import {
  createStagedInventoryRowRequest,
  markStagedRowsForImportRequest,
  updateImportStagedInventoryFilterRowsRequest,
} from "@/modules/imports/data/mutations"

function createRevisionKey(record: ImportDetail, filterRows: StagedInventoryFilterRow[]) {
  return `${record.updatedAt}:${filterRows.length}`
}

function toDraftForm(draft: ImportFilterRowDraft) {
  return {
    categoryFilterId: draft.categoryFilterId,
    productId: draft.productId,
    stockOrdered: draft.stockOrdered,
  }
}

function formIsDirty(draft: ImportFilterRowDraft, server: StagedInventoryFilterRow): boolean {
  return (
    draft.categoryFilterId !== server.categoryFilterId ||
    draft.productId !== server.productId ||
    draft.stockOrdered !== server.stockOrdered
  )
}

function buildFiltersDiff(
  drafts: ImportFilterRowDraft[],
  serverRows: StagedInventoryFilterRow[],
): StagedInventoryFiltersDiff {
  const serverById = new Map(serverRows.map((row) => [row.id, row]))
  const liveDraftIds = new Set(
    drafts.filter((draft) => !isLocalOnlyRecordRow(draft.clientId)).map((d) => d.clientId),
  )

  const added: StagedInventoryFilterRowDraft[] = []
  const modified: StagedInventoryFilterRowUpdate[] = []
  const deleted: StagedInventoryFilterRowDelete[] = []

  for (const draft of drafts) {
    if (isLocalOnlyRecordRow(draft.clientId)) {
      added.push({ tempId: draft.clientId, form: toDraftForm(draft) })
      continue
    }
    const existing = serverById.get(draft.clientId)
    if (!existing) {
      // Server drift — treat as add.
      added.push({ tempId: draft.clientId, form: toDraftForm(draft) })
      continue
    }
    if (formIsDirty(draft, existing)) {
      modified.push({ id: existing.id, form: toDraftForm(draft) })
    }
  }

  for (const serverRow of serverRows) {
    if (!liveDraftIds.has(serverRow.id)) {
      deleted.push({ id: serverRow.id })
    }
  }

  return { added, modified, deleted }
}

/**
 * Patches emitted by the staged-inv-row side panel. Carries the
 * refreshed filter row so the parent can keep `remainingStock` +
 * `startingStockSum` + `childRowCount` in sync without a list refetch.
 */
export type StagedInvRowPanelPatch =
  | { kind: "upsert"; row: StagedInventoryRow; filterRow: StagedInventoryFilterRow }
  | { kind: "delete"; rowId: string; filterRow: StagedInventoryFilterRow }

export function useImportStagedInventoryFilterRowsSection({
  record,
  filterRows,
  stagedRows,
  publishFilterRows,
  publishStagedRows,
  publishMarkedForImport,
}: {
  record: ImportDetail
  filterRows: StagedInventoryFilterRow[]
  stagedRows: StagedInventoryRow[]
  publishFilterRows: (rows: StagedInventoryFilterRow[]) => void
  publishStagedRows: (rows: StagedInventoryRow[]) => void
  /**
   * Optimistic-flip callback for the mark-for-import worker trigger.
   * Receives the ids the worker accepted (DRAFT → QUEUED).
   */
  publishMarkedForImport: (markedIds: string[]) => void
}) {
  const filterDiffMutation = useMutation({
    mutationFn: (input: { diff: StagedInventoryFiltersDiff; revisionKey: string }) =>
      updateImportStagedInventoryFilterRowsRequest(record.id, input.diff, input.revisionKey),
  })

  const section = useRecordScopedSectionController<
    StagedInventoryFilterRow[],
    ImportFilterRowDraft[]
  >({
    recordId: record.id,
    sectionKey: "staged-inventory-filter-rows",
    serverValue: filterRows,
    serverRevisionKey: createRevisionKey(record, filterRows),
    createLocalValue: toImportFilterRowDrafts,
    persistDraft: false,
    policy: {
      addRowPlacement: "bottom",
      childRows: "none",
    },
    onSave: async (localValue, currentServer) => {
      const validationError = validateImportFilterRowDrafts(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const diff = buildFiltersDiff(localValue, currentServer)
      if (diff.added.length === 0 && diff.modified.length === 0 && diff.deleted.length === 0) {
        return {
          serverValue: currentServer,
          serverRevisionKey: createRevisionKey(record, currentServer),
          noticeMessage: "No changes to save",
        }
      }

      const response = await filterDiffMutation.mutateAsync({
        diff,
        revisionKey: record.updatedAt,
      })
      publishFilterRows(response.filterRows)

      return {
        serverValue: response.filterRows,
        serverRevisionKey: createRevisionKey(response.import ?? record, response.filterRows),
        noticeMessage: "Filter rows saved",
      }
    },
  })

  // --- Draft mutators (inline edits in the parent grid) ---

  const addFilterRow = useCallback(() => {
    section.setLocalValue((prev) => [
      ...prev,
      createImportFilterRowDraft(createLocalRecordRowId("import-filter-row")),
    ])
    if (section.error) section.setError(null)
  }, [section])

  const removeFilterRow = useCallback(
    (clientId: string) => {
      section.setLocalValue((prev) => prev.filter((row) => row.clientId !== clientId))
      if (section.error) section.setError(null)
    },
    [section],
  )

  const setFilterField = useCallback(
    <K extends keyof Pick<ImportFilterRowDraft, "productId" | "stockOrdered">>(
      clientId: string,
      field: K,
      value: ImportFilterRowDraft[K],
    ) => {
      section.setLocalValue((prev) =>
        prev.map((row) => (row.clientId === clientId ? { ...row, [field]: value } : row)),
      )
      if (section.error) section.setError(null)
    },
    [section],
  )

  const setFilterCategoryFilter = useCallback(
    (clientId: string, categoryId: string | null) => {
      section.setLocalValue((prev) =>
        prev.map((row) =>
          row.clientId === clientId ? { ...row, categoryFilterId: categoryId } : row,
        ),
      )
      if (section.error) section.setError(null)
    },
    [section],
  )

  const setFilterProductSnapshot = useCallback(
    (clientId: string, option: ProductOption | null) => {
      section.setLocalValue((prev) =>
        prev.map((row) => {
          if (row.clientId !== clientId) return row
          if (option === null) {
            return { ...row, productName: "", stockUnitName: "", stockUnitAbbrev: "" }
          }
          return {
            ...row,
            productName: option.name,
            stockUnitName: option.stockUnitName ?? "",
            stockUnitAbbrev: option.stockUnitAbbrev,
          }
        }),
      )
    },
    [section],
  )

  // --- Patch from the side panel after a per-row staged mutation ---

  const applyStagedRowPatch = useCallback(
    (patch: StagedInvRowPanelPatch) => {
      // Splice the refreshed filter row into the server snapshot — the
      // engine's revisionKey ignores totals changes (it's record.updatedAt
      // + filterRows.length), so the user's in-progress draft isn't
      // rebased.
      publishFilterRows(
        filterRows.map((row) => (row.id === patch.filterRow.id ? patch.filterRow : row)),
      )

      if (patch.kind === "upsert") {
        const exists = stagedRows.some((row) => row.id === patch.row.id)
        publishStagedRows(
          exists
            ? stagedRows.map((row) => (row.id === patch.row.id ? patch.row : row))
            : [...stagedRows, patch.row],
        )
      } else {
        publishStagedRows(stagedRows.filter((row) => row.id !== patch.rowId))
      }
    },
    [filterRows, stagedRows, publishFilterRows, publishStagedRows],
  )

  // --- Inline duplicate (synchronous POST, no panel) ---

  const duplicateMutation = useMutation({
    mutationFn: (input: { source: StagedInventoryRow }) =>
      createStagedInventoryRowRequest({
        importId: record.id,
        filterRowId: input.source.filterRowId,
        form: {
          rollNumber: input.source.rollNumber,
          dyeLot: input.source.dyeLot,
          location: input.source.location,
          startingStock: input.source.startingStock,
          note: input.source.note,
        },
      }),
    onSuccess: (response) => {
      applyStagedRowPatch({ kind: "upsert", row: response.row, filterRow: response.filterRow })
    },
  })

  const duplicateStagedRow = useCallback(
    (source: StagedInventoryRow) => {
      if (source.status !== "DRAFT") return
      duplicateMutation.mutate({ source })
    },
    [duplicateMutation],
  )

  // --- Mark-for-import batch flow ---

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
        const result = await markStagedRowsForImportRequest(record.id, ids)
        publishMarkedForImport(result.batch.markedRowIds)
      },
      [record.id, publishMarkedForImport],
    ),
    isSectionDirty: section.isDirty,
    isSectionBusy: section.isSaving,
  })

  const stagedRowsByFilterId = useMemo(() => {
    const map = new Map<string, StagedInventoryRow[]>()
    for (const row of stagedRows) {
      const list = map.get(row.filterRowId) ?? []
      list.push(row)
      map.set(row.filterRowId, list)
    }
    return map
  }, [stagedRows])

  return {
    ...section,
    addFilterRow,
    removeFilterRow,
    setFilterField,
    setFilterCategoryFilter,
    setFilterProductSnapshot,
    applyStagedRowPatch,
    duplicateStagedRow,
    isDuplicating: duplicateMutation.isPending,
    stagedRowsByFilterId,
    // Mark-for-import surface
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
