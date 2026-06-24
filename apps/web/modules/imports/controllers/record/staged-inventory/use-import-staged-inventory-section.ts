"use client"

import type {
  ImportDetail,
  StagedInventoryFilterRow,
  StagedInventoryRow,
} from "@builders/domain"
import { useImportFilterRows } from "./use-import-filter-rows"
import { useImportStagedRowSelection } from "./use-import-staged-row-selection"

/**
 * Top-level staged-inventory section controller. Composes the combined
 * filter+staged-row diff slice with the staged-row selection slice
 * (mark-for-import batch). Threads section dirty/busy flags from the
 * engine into the selection gate.
 *
 * Return shape is the flat surface the section component consumes.
 */
export function useImportStagedInventorySection({
  record,
  filterRows,
  stagedRows,
  publishFilterRows,
  publishStagedRows,
  publishMarkedForImport,
  publishRecord,
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
  /**
   * Pushes the bumped parent import back into the shared record. Both the
   * section save and mark-for-import now stamp the parent (aggregate-root
   * actor), so the OCC token (record.updatedAt) must resync after either.
   */
  publishRecord: (record: ImportDetail) => void
}) {
  const filters = useImportFilterRows({
    record,
    filterRows,
    stagedRows,
    publishFilterRows,
    publishStagedRows,
    publishRecord,
  })

  const selection = useImportStagedRowSelection({
    importId: record.id,
    stagedRows,
    publishMarkedForImport,
    publishRecord,
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
