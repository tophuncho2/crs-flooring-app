"use client"

import type {
  ImportDetail,
  StagedInventoryFilterRow,
  StagedInventoryRow,
} from "@builders/domain"
import type { ImportReconcileResponse } from "../drafts"
import { useImportFilterRows } from "./use-import-filter-rows"
import { useImportStagedRowSelection } from "./use-import-staged-row-selection"

/**
 * Top-level staged-inventory section controller. Composes the combined
 * filter+staged-row diff slice with the staged-row selection slice
 * (mark-for-import batch). Threads section dirty/busy flags from the
 * engine into the selection gate.
 *
 * Owned by the record-level `useImportRecordController`, which supplies the
 * single `reconcileAfterWrite` seam and the optimistic `markRowsQueued` flip.
 * Return shape is the flat surface the section component consumes.
 */
export function useImportStagedInventorySection({
  record,
  filterRows,
  stagedRows,
  reconcileAfterWrite,
  markRowsQueued,
}: {
  record: ImportDetail
  filterRows: StagedInventoryFilterRow[]
  stagedRows: StagedInventoryRow[]
  /** Single sync seam — see `ImportReconcileResponse`. */
  reconcileAfterWrite: (response: ImportReconcileResponse) => void
  /**
   * Optimistic-flip callback for the mark-for-import worker trigger.
   * Receives the ids the worker accepted (DRAFT → QUEUED).
   */
  markRowsQueued: (markedIds: string[]) => void
}) {
  const filters = useImportFilterRows({
    record,
    filterRows,
    stagedRows,
    reconcileAfterWrite,
  })

  const selection = useImportStagedRowSelection({
    importId: record.id,
    stagedRows,
    markRowsQueued,
    reconcileAfterWrite,
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
    addStagedRowDraft: filters.addStagedRowDraft,
    duplicateStagedRowDraft: filters.duplicateStagedRowDraft,
    removeStagedRowDraft: filters.removeStagedRowDraft,
    setStagedRowField: filters.setStagedRowField,
    ...selection,
  }
}
