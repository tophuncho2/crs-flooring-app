"use client"

import type {
  ImportDetail,
  StagedInventoryFilterRow,
  StagedInventoryRow,
} from "@builders/domain"
import { useImportFilterRows } from "./use-import-filter-rows"
import { useImportStagedRowSelection } from "./use-import-staged-row-selection"

export type { StagedInvRowPanelPatch } from "./types"

/**
 * Top-level staged-inventory section controller. Composes the filter-row
 * slice (drafts + diff save + duplicate + patch path) with the staged-row
 * selection slice (mark-for-import batch). Threads section dirty/busy
 * flags from the engine into the selection gate.
 *
 * Return shape is the flat surface the section component consumes — no
 * public API change vs. the pre-split version.
 */
export function useImportStagedInventorySection({
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
  const filters = useImportFilterRows({
    record,
    filterRows,
    stagedRows,
    publishFilterRows,
    publishStagedRows,
  })

  const selection = useImportStagedRowSelection({
    importId: record.id,
    stagedRows,
    publishMarkedForImport,
    isSectionDirty: filters.section.isDirty,
    isSectionBusy: filters.section.isSaving,
  })

  return {
    ...filters.section,
    addFilterRow: filters.addFilterRow,
    removeFilterRow: filters.removeFilterRow,
    setFilterField: filters.setFilterField,
    setFilterCategoryFilter: filters.setFilterCategoryFilter,
    setFilterProductSnapshot: filters.setFilterProductSnapshot,
    applyStagedRowPatch: filters.applyStagedRowPatch,
    duplicateStagedRow: filters.duplicateStagedRow,
    isDuplicating: filters.isDuplicating,
    stagedRowsByFilterId: filters.stagedRowsByFilterId,
    ...selection,
  }
}
