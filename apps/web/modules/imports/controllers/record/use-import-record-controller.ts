"use client"

import { useCallback, useRef, useState } from "react"
import {
  createRecordSectionError,
  usePendingWorkflowPolling,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import {
  toImportPrimaryForm,
  type ImportDetail,
  type ImportPrimaryForm,
  type StagedInventoryFilterRow,
  type StagedInventoryRow,
} from "@builders/domain"
import { validateImportPrimaryForm, type ImportReconcileResponse } from "./drafts"
import { useImportsListMutations } from "@/modules/imports/controllers/list/use-imports-list-mutations"
import { fetchImportStagedInventoryRequest } from "@/modules/imports/data/mutations"
import { useImportStagedInventorySection } from "./staged-inventory/use-import-staged-inventory-section"

// ~2 minutes at the poll hook's 3s default. Bounds the queued→imported poll so
// a failed/stuck worker job can't spin it forever (see `pollExhausted`).
const MAX_IMPORT_POLL_TICKS = 40

/**
 * Single record-level controller for the imports detail view. Imports is the
 * one aggregate root where a child-section save stamps + locks the parent, so
 * unlike other modules the whole record is driven from here: it owns the
 * canonical record (+ OCC token) via the engine's single-section controller,
 * the filter/staged row arrays, and the one `reconcileAfterWrite` seam every
 * write routes through. That makes the OCC resync structural instead of a
 * by-convention call at each mutation site.
 */
export function useImportRecordController({
  page,
  entry,
  initialFilterRows,
  initialStagedRows,
}: {
  page: RecordDetailClientScaffoldContext
  entry: ImportDetail
  initialFilterRows: StagedInventoryFilterRow[]
  initialStagedRows: StagedInventoryRow[]
}) {
  const { updateImport, deleteImport } = useImportsListMutations()

  const recordController = useSingleSectionRecordController<ImportDetail, ImportPrimaryForm>({
    page,
    scope: "imports",
    id: entry.id,
    initialRecord: entry,
    detailUrl: `/api/imports/${entry.id}`,
    payloadKey: "import",
    createLocalValue: toImportPrimaryForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const validationError = validateImportPrimaryForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const payload = await updateImport.mutateAsync({
        id: record.id,
        input: localValue,
        revisionKey: record.updatedAt,
      })
      return {
        serverValue: payload.import,
        noticeMessage: "Import saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteImport.mutateAsync({ id: record.id, updatedAt: record.updatedAt })
    },
    deleteErrorMessage: "Failed to delete import",
  })

  // Filter + staged rows live here so per-row mutations and the import poll can
  // refresh both arrays in place without a full page/list refetch.
  const [filterRows, setFilterRows] = useState(initialFilterRows)
  const [stagedRows, setStagedRows] = useState(initialStagedRows)

  // THE single sync seam. Every import write (and the poll) hands its fresh
  // server data here; this is the one place the shared record's OCC token and
  // the row arrays are kept coherent.
  //
  // Import-only aggregate-root seam. When a SECOND module needs
  // parent-locking-on-child-save, lift this into the record-view engine
  // (`useRecordDetailController`) as a first-class `onSectionWriteReconcile`
  // contract — until then a thin module seam is correct (one consumer = no
  // engine abstraction).
  const reconcileAfterWrite = useCallback(
    (response: ImportReconcileResponse) => {
      if (response.import) recordController.publishRecord(response.import)
      if (response.filterRows) setFilterRows(response.filterRows)
      if (response.stagedRows) setStagedRows(response.stagedRows)
    },
    [recordController],
  )

  // --- Queued → Imported polling ---
  // The worker flips staged rows QUEUED → IMPORTED in the DB but does NOT stamp
  // the parent, so nothing here changes until we re-read. Poll the read-only
  // rows endpoint while any row is QUEUED and reconcile each tick.
  const hasQueuedRows = stagedRows.some((row) => row.status === "QUEUED")
  const pollTicksRef = useRef(0)
  const [pollExhausted, setPollExhausted] = useState(false)

  // Optimistic flip from mark-for-import: the worker accepted these ids, so
  // flip them DRAFT → QUEUED in-place. This also opens a fresh poll round, so
  // reset the bounded-poll guard here (the realistic trigger for new QUEUED
  // rows). The poll below then drives QUEUED → IMPORTED.
  const markRowsQueued = useCallback((markedIds: string[]) => {
    const set = new Set(markedIds)
    pollTicksRef.current = 0
    setPollExhausted(false)
    setStagedRows((previous) =>
      previous.map((row) => (set.has(row.id) ? { ...row, status: "QUEUED" as const } : row)),
    )
  }, [])

  usePendingWorkflowPolling<{ hasQueued: boolean }>({
    isPending: hasQueuedRows && !pollExhausted,
    refresh: async () => {
      pollTicksRef.current += 1
      if (pollTicksRef.current > MAX_IMPORT_POLL_TICKS) {
        setPollExhausted(true)
        return null
      }
      const next = await fetchImportStagedInventoryRequest(entry.id)
      reconcileAfterWrite({ filterRows: next.filterRows, stagedRows: next.stagedRows })
      return { hasQueued: next.stagedRows.some((row) => row.status === "QUEUED") }
    },
  })

  const stagedInventory = useImportStagedInventorySection({
    record: recordController.record,
    filterRows,
    stagedRows,
    reconcileAfterWrite,
    markRowsQueued,
  })

  return {
    page,
    record: recordController.record,
    primarySection: recordController.primarySection,
    deleteRecord: recordController.deleteRecord,
    filterRows,
    stagedRows,
    stagedInventory,
    /** True once the import poll gave up (likely a stuck worker job). */
    pollExhausted,
  }
}
