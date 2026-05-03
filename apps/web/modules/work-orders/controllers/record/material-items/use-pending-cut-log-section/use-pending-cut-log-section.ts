"use client"

import { useCallback, useMemo } from "react"
import { useMutation } from "@tanstack/react-query"
import type { CutLogRow, FlooringCutLogStatus } from "@builders/domain"
import {
  createPendingCutLogRequest,
  deletePendingCutLogRequest,
  updatePendingCutLogRequest,
  voidWorkOrderCutLogRequest,
} from "@/modules/work-orders/data/mutations"
import { buildSavedForm, isDraftDirty, isSavedDirty, rowId, toSavedRow } from "./helpers"
import type { DraftRow, PendingCutLogRowController, SavedRow } from "./types"
import { usePendingCutLogRowState } from "./use-row-state"

/**
 * Section controller for the per-WOMI pending-cut-log row UI. Composes the
 * row-state hook with the four mutations (create / update / delete / void)
 * and projects each row down to a `PendingCutLogRowController` the row UI
 * consumes.
 *
 * Reconciliation is callback-driven (no React Query invalidation): each
 * mutation response patches local state directly via the writers exposed
 * by `usePendingCutLogRowState`.
 */
export function usePendingCutLogSection({
  workOrderId,
  workOrderItemId,
  initialRows,
}: {
  workOrderId: string
  workOrderItemId: string
  initialRows: ReadonlyArray<CutLogRow>
}) {
  const state = usePendingCutLogRowState(initialRows)
  const {
    rows,
    editingRowId,
    errorByRowId,
    recentlySavedRowId,
    setEditingRowId,
    setRecentlySavedRowId,
    findRow,
    writeRow,
    dropRow,
    setError,
    enterEditMode,
    addDraft,
    discardDraft,
    setField,
    clearLocationAndSectionFilters,
  } = state

  const createMutation = useMutation({
    mutationFn: (input: { clientId: string; draft: DraftRow }) =>
      createPendingCutLogRequest({
        workOrderId,
        workOrderItemId,
        inventoryId: input.draft.form.inventoryId,
        cut: input.draft.form.cut,
        isWaste: input.draft.form.isWaste,
        notes: input.draft.form.notes,
      }).then((response) => ({ response, clientId: input.clientId })),
    onSuccess: ({ response, clientId }) => {
      writeRow(clientId, toSavedRow(response.cutLog))
      setEditingRowId((current) => (current === clientId ? null : current))
      setError(clientId, null)
      setRecentlySavedRowId(response.cutLog.id)
    },
    onError: (error: unknown, variables) => {
      setError(variables.clientId, error instanceof Error ? error.message : String(error))
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: { saved: SavedRow }) => {
      const patch: { cut?: string; isWaste?: boolean; notes?: string } = {}
      if (input.saved.edits.cut !== undefined) patch.cut = input.saved.edits.cut
      if (input.saved.edits.isWaste !== undefined) patch.isWaste = input.saved.edits.isWaste
      if (input.saved.edits.notes !== undefined) patch.notes = input.saved.edits.notes
      return updatePendingCutLogRequest({
        workOrderId,
        cutLogId: input.saved.row.id,
        workOrderItemId,
        expectedUpdatedAt: input.saved.row.updatedAt,
        patch,
      })
    },
    onSuccess: (response, variables) => {
      const id = variables.saved.row.id
      writeRow(id, toSavedRow(response.cutLog))
      setEditingRowId((current) => (current === id ? null : current))
      setError(id, null)
      setRecentlySavedRowId(id)
    },
    onError: (error: unknown, variables) => {
      setError(
        variables.saved.row.id,
        error instanceof Error ? error.message : String(error),
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (input: { saved: SavedRow }) =>
      deletePendingCutLogRequest({
        workOrderId,
        cutLogId: input.saved.row.id,
        workOrderItemId,
        expectedUpdatedAt: input.saved.row.updatedAt,
      }),
    onSuccess: (_response, variables) => {
      const id = variables.saved.row.id
      dropRow(id)
      setEditingRowId((current) => (current === id ? null : current))
      setError(id, null)
    },
    onError: (error: unknown, variables) => {
      setError(
        variables.saved.row.id,
        error instanceof Error ? error.message : String(error),
      )
    },
  })

  const voidMutation = useMutation({
    mutationFn: (input: { saved: SavedRow }) =>
      voidWorkOrderCutLogRequest({
        workOrderId,
        cutLogId: input.saved.row.id,
      }),
    onSuccess: (_response, variables) => {
      const id = variables.saved.row.id
      // Optimistic local patch matching `buildVoidedCutLogPatch` from domain:
      // cut → "0", coverageCut/cost/freight → null, void → true, status → VOID.
      writeRow(id, {
        kind: "saved",
        row: {
          ...variables.saved.row,
          cut: "0",
          coverageCut: null,
          cost: null,
          freight: null,
          void: true,
          status: "VOID",
        },
        edits: {},
        locationFilterCode: "",
        sectionFilterCode: "",
      })
      setError(id, null)
    },
    onError: (error: unknown, variables) => {
      setError(
        variables.saved.row.id,
        error instanceof Error ? error.message : String(error),
      )
    },
  })

  const getRowController = useCallback(
    (id: string): PendingCutLogRowController | null => {
      const row = findRow(id)
      if (!row) return null
      const isEditing = editingRowId === id
      const error = errorByRowId[id] ?? null
      const isPendingMutation =
        (createMutation.isPending && createMutation.variables?.clientId === id) ||
        (updateMutation.isPending && updateMutation.variables?.saved.row.id === id) ||
        (deleteMutation.isPending && deleteMutation.variables?.saved.row.id === id) ||
        (voidMutation.isPending && voidMutation.variables?.saved.row.id === id)

      if (row.kind === "draft") {
        const dirty = isDraftDirty(row)
        const canCommit =
          row.form.inventoryId !== "" && row.form.cut.trim() !== ""
        const commitState: PendingCutLogRowController["commitState"] =
          isPendingMutation
            ? "pending"
            : recentlySavedRowId === id
              ? "success"
              : dirty && canCommit
                ? "dirty"
                : "pristine"
        return {
          rowId: id,
          kind: "draft",
          row: null,
          form: row.form,
          isEditing,
          isDirty: dirty,
          commitState,
          error,
          destructiveEnabled: false,
          destructiveStatus: "DRAFT",
          setLocationFilterCode: (next) => setField(id, "locationFilterCode", next),
          setSectionFilterCode: (next) => setField(id, "sectionFilterCode", next),
          clearLocationAndSectionFilters: () => clearLocationAndSectionFilters(id),
          setInventoryId: (next) => setField(id, "inventoryId", next),
          setCut: (next) => setField(id, "cut", next),
          setIsWaste: (next) => setField(id, "isWaste", next),
          setNotes: (next) => setField(id, "notes", next),
          commit: () => {
            if (!canCommit || isPendingMutation) return
            createMutation.mutate({ clientId: id, draft: row })
          },
          fireDestructive: () => {
            discardDraft(id)
          },
          discardDraft: () => discardDraft(id),
        }
      }

      const dirty = isSavedDirty(row)
      const status = row.row.status as FlooringCutLogStatus
      const destructiveEnabled =
        !isPendingMutation &&
        (status === "PENDING" || (status === "FINAL" && !row.row.void))
      const commitState: PendingCutLogRowController["commitState"] =
        isPendingMutation
          ? "pending"
          : recentlySavedRowId === id
            ? "success"
            : dirty
              ? "dirty"
              : "pristine"

      return {
        rowId: id,
        kind: "saved",
        row: row.row,
        form: buildSavedForm(row),
        isEditing,
        isDirty: dirty,
        commitState,
        error,
        destructiveEnabled,
        destructiveStatus: status,
        setLocationFilterCode: (next) => setField(id, "locationFilterCode", next),
        setSectionFilterCode: (next) => setField(id, "sectionFilterCode", next),
        clearLocationAndSectionFilters: () => clearLocationAndSectionFilters(id),
        setInventoryId: () => {
          // Inventory is immutable on saved rows; no-op.
        },
        setCut: (next) => setField(id, "cut", next),
        setIsWaste: (next) => setField(id, "isWaste", next),
        setNotes: (next) => setField(id, "notes", next),
        commit: () => {
          if (!dirty || isPendingMutation) return
          updateMutation.mutate({ saved: row })
        },
        fireDestructive: () => {
          if (!destructiveEnabled) return
          if (status === "PENDING") {
            deleteMutation.mutate({ saved: row })
          } else if (status === "FINAL") {
            voidMutation.mutate({ saved: row })
          }
        },
        discardDraft: () => {
          // Saved rows: discardDraft is a no-op; use enterEditMode(null) to
          // drop edits without destroying the row.
        },
      }
    },
    [
      findRow,
      editingRowId,
      errorByRowId,
      recentlySavedRowId,
      createMutation,
      updateMutation,
      deleteMutation,
      voidMutation,
      setField,
      discardDraft,
      clearLocationAndSectionFilters,
    ],
  )

  const rowIds = useMemo(() => rows.map((row) => rowId(row)), [rows])

  return {
    rows,
    rowIds,
    editingRowId,
    errorByRowId,
    addDraft,
    enterEditMode,
    discardDraft,
    getRowController,
  }
}

export type PendingCutLogSection = ReturnType<typeof usePendingCutLogSection>
