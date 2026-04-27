"use client"

import { useCallback } from "react"
import {
  createLocalRecordRowId,
  createRecordSectionError,
  useBatchSelectAction,
  useRecordScopedSectionController,
} from "@/modules/shared/engines/record-view"
import {
  type CutLogDelete,
  type CutLogDraft as DomainCutLogDraft,
  type CutLogPatch,
  type CutLogRow,
  type CutLogUpdate,
  type CutLogsDiff,
  isCutLogPendingEditable,
} from "@builders/domain"
import type { InventoryDetailRecord } from "@builders/db"
import {
  createCutLogDraft,
  isLocalCutLogDraft,
  toCutLogDrafts,
  validateCutLogDrafts,
  type CutLogDraft as ClientCutLogDraft,
} from "./drafts"
import {
  markCutLogsForFinalizeRequest,
  saveCutLogPendingDiffRequest,
} from "../data/mutations"

function createDraftRow(): ClientCutLogDraft {
  return {
    ...createCutLogDraft(),
    clientId: createLocalRecordRowId("inventory-cut-log"),
  }
}

function createRowsRevisionKey(
  record: InventoryDetailRecord,
  rows: ReadonlyArray<CutLogRow>,
) {
  return `${record.updatedAt}:${rows.length}:${rows.map((r) => r.updatedAt).join(",")}`
}

function toAddedDraftPayload(draft: ClientCutLogDraft): DomainCutLogDraft {
  return {
    tempId: draft.clientId,
    cut: draft.cut,
    cost: draft.cost,
    freight: draft.freight,
    isWaste: draft.isWaste,
    notes: draft.notes,
  }
}

function toUpdatePatch(draft: ClientCutLogDraft, existing: CutLogRow): CutLogPatch {
  const patch: CutLogPatch = {}
  if (draft.cut !== existing.cut) patch.cut = draft.cut
  if ((draft.cost || null) !== existing.cost) patch.cost = draft.cost
  if ((draft.freight || null) !== existing.freight) patch.freight = draft.freight
  if (draft.isWaste !== existing.isWaste) patch.isWaste = draft.isWaste
  if (draft.notes !== existing.notes) patch.notes = draft.notes
  return patch
}

function buildCutLogsDiff(
  localDrafts: ReadonlyArray<ClientCutLogDraft>,
  serverRows: ReadonlyArray<CutLogRow>,
): CutLogsDiff {
  // Drafts now ride alongside locked (FINAL / VOID / QUEUED) rows so the
  // section grid can render them with `editable={false}` cells. Only the
  // pending-editable subset is eligible for modify / delete diffs.
  const editableServerRows = serverRows.filter((row) => isCutLogPendingEditable(row))
  const editableServerById = new Map(editableServerRows.map((row) => [row.id, row]))
  const localServerIds = new Set(
    localDrafts
      .filter((draft) => !isLocalCutLogDraft(draft))
      .map((draft) => draft.clientId),
  )

  const added: DomainCutLogDraft[] = []
  const modified: CutLogUpdate[] = []
  const deleted: CutLogDelete[] = []

  for (const draft of localDrafts) {
    if (isLocalCutLogDraft(draft)) {
      added.push(toAddedDraftPayload(draft))
      continue
    }
    const existing = editableServerById.get(draft.clientId)
    if (!existing) {
      // Either the row is locked (FINAL / VOID / QUEUED) and just along
      // for the visual ride, or it drifted out of editable state since
      // load — either way nothing to send for it.
      continue
    }
    const patch = toUpdatePatch(draft, existing)
    if (Object.keys(patch).length > 0) {
      modified.push({
        id: existing.id,
        expectedUpdatedAt: existing.updatedAt,
        patch,
      })
    }
  }

  for (const editableRow of editableServerRows) {
    if (!localServerIds.has(editableRow.id)) {
      deleted.push({
        id: editableRow.id,
        expectedUpdatedAt: editableRow.updatedAt,
      })
    }
  }

  return { added, modified, deleted }
}

/**
 * Apply the diff optimistically to the server snapshot so the UI can
 * render the post-save state immediately. Worker reconciles within
 * ~2s; manual refresh resolves any drift.
 */
function applyDiffOptimistically(
  serverRows: ReadonlyArray<CutLogRow>,
  diff: CutLogsDiff,
  tempIdMap: Record<string, string>,
  nowIso: string,
): CutLogRow[] {
  const deletedIds = new Set(diff.deleted.map((d) => d.id))
  const modifiedById = new Map(diff.modified.map((m) => [m.id, m.patch]))

  const updated: CutLogRow[] = []
  for (const row of serverRows) {
    if (deletedIds.has(row.id)) continue
    const patch = modifiedById.get(row.id)
    if (patch) {
      updated.push({
        ...row,
        cut: patch.cut ?? row.cut,
        cost: patch.cost === undefined ? row.cost : patch.cost,
        freight: patch.freight === undefined ? row.freight : patch.freight,
        isWaste: patch.isWaste ?? row.isWaste,
        notes: patch.notes ?? row.notes,
        updatedAt: nowIso,
      })
    } else {
      updated.push(row)
    }
  }

  const inventoryId = serverRows[0]?.inventoryId ?? ""
  for (const draft of diff.added) {
    const stampedId = tempIdMap[draft.tempId]
    if (!stampedId) continue
    updated.push({
      id: stampedId,
      cutLogNumber: "(pending)",
      inventoryId,
      workOrderId: null,
      workOrderItemId: null,
      before: "0",
      cut: draft.cut,
      after: "0",
      coverageCut: null,
      status: "PENDING",
      isFinal: false,
      finalCutSequence: null,
      isWaste: draft.isWaste,
      void: false,
      cost: draft.cost ? draft.cost : null,
      freight: draft.freight ? draft.freight : null,
      notes: draft.notes,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
  }

  return updated
}

export function useInventoryCutLogsSection({
  record,
  cutLogs,
  publishRecord,
  publishCutLogs,
}: {
  record: InventoryDetailRecord
  cutLogs: CutLogRow[]
  publishRecord: (record: InventoryDetailRecord) => void
  publishCutLogs: (rows: CutLogRow[]) => void
}) {
  const section = useRecordScopedSectionController<CutLogRow[], ClientCutLogDraft[]>({
    recordId: record.id,
    sectionKey: "cut-logs",
    serverValue: cutLogs,
    serverRevisionKey: createRowsRevisionKey(record, cutLogs),
    createLocalValue: toCutLogDrafts,
    persistDraft: false,
    policy: {
      addRowPlacement: "top",
      childRows: "none",
    },
    onSave: async (localValue, currentServerRows) => {
      const validationError = validateCutLogDrafts(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const diff = buildCutLogsDiff(localValue, currentServerRows)
      if (
        diff.added.length === 0 &&
        diff.modified.length === 0 &&
        diff.deleted.length === 0
      ) {
        return {
          serverValue: currentServerRows,
          serverRevisionKey: createRowsRevisionKey(record, currentServerRows),
          noticeMessage: "No changes to save",
        }
      }

      const response = await saveCutLogPendingDiffRequest(
        record.id,
        diff,
        record.updatedAt,
      )

      // Producer returns 202 + tempIdMap (no full reload). Apply the
      // diff optimistically so the engine can reseed drafts to the
      // post-save state. Worker reconciles within ~2s.
      const optimisticRows = applyDiffOptimistically(
        currentServerRows,
        diff,
        response.batch.tempIdMap,
        new Date().toISOString(),
      )
      publishCutLogs(optimisticRows)

      return {
        serverValue: optimisticRows,
        serverRevisionKey: createRowsRevisionKey(record, optimisticRows),
        noticeMessage: "Cut log changes queued",
      }
    },
  })

  function addRow() {
    section.setLocalValue((previous) => [createDraftRow(), ...previous])
    if (section.error) {
      section.setError(null)
    }
  }

  function removeRow(index: number) {
    section.setLocalValue((previous) =>
      previous.filter((_, rowIndex) => rowIndex !== index),
    )
    if (section.error) {
      section.setError(null)
    }
  }

  function setRowField<K extends Exclude<keyof ClientCutLogDraft, "clientId">>(
    index: number,
    field: K,
    value: ClientCutLogDraft[K],
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

  // Batch finalize. Eligibility = persisted server row that's pending +
  // not finalized + not voided. The "section must be clean" rule
  // (intent doc) is enforced at the section component (disable button
  // when `section.isDirty`).
  const finalize = useBatchSelectAction<CutLogRow>({
    rows: cutLogs,
    isEligible: (row) => isCutLogPendingEditable(row),
    performAction: useCallback(
      async (ids) => {
        const response = await markCutLogsForFinalizeRequest(
          record.id,
          ids,
          record.updatedAt,
        )
        const markedSet = new Set(response.batch.markedRowIds)
        publishCutLogs(
          cutLogs.map((row) =>
            markedSet.has(row.id) ? { ...row, status: "QUEUED" as const } : row,
          ),
        )
      },
      [record.id, record.updatedAt, cutLogs, publishCutLogs],
    ),
  })

  return {
    ...section,
    record,
    cutLogs,
    publishCutLogs,
    publishRecord,
    addRow,
    removeRow,
    setRowField,
    selectedIds: finalize.selectedIds,
    toggleSelection: finalize.toggleSelected,
    clearSelection: finalize.clearSelection,
    eligibleSelectedIds: finalize.eligibleSelectedIds,
    isFinalizing: finalize.isFiring,
    finalizeError: finalize.error,
    clearFinalizeError: finalize.clearError,
    finalizeSelected: finalize.fire,
  }
}
