"use client"

import { useCallback, useMemo, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import type { CutLogRow, FlooringCutLogStatus } from "@builders/domain"
import {
  createPendingCutLogRequest,
  deletePendingCutLogRequest,
  updatePendingCutLogRequest,
} from "../data/mutations"
import { voidWorkOrderCutLogRequest } from "../data/mutations"

/**
 * Per-row controller surface returned by `usePendingCutLogSection.getRowController`.
 * Each cut-log row consumes this to render itself: the editable form values,
 * the commit-button state, the destructive-action availability, and the
 * action-firing callbacks. The section owns all the underlying state — this
 * shape is just a thin per-row projection.
 */
export type PendingCutLogRowController = {
  /** Stable id for this row — `row.id` for saved rows, `clientId` for drafts. */
  rowId: string
  /** Underlying row state. Drafts have no server row yet; saved rows always do. */
  kind: "draft" | "saved"
  /** Saved server row, if this is a saved row. */
  row: CutLogRow | null
  /** Live form values driving the editable cells (snapshot + dirty edits merged). */
  form: PendingCutLogForm
  /** True when the row is currently the editingRow at the section level. */
  isEditing: boolean
  /** True when the row has uncommitted local changes. */
  isDirty: boolean
  /** Visual state for the circular commit button. */
  commitState: "pristine" | "dirty" | "pending" | "success"
  /** Last error from a failed mutation against this row, or null. */
  error: string | null
  /** True when the destructive action button should be enabled for this row. */
  destructiveEnabled: boolean
  /** Status drives the destructive-action dialog copy ("Delete" vs "Void"). */
  destructiveStatus: FlooringCutLogStatus | "DRAFT"
  // --- mutators ---
  setLocationFilterCode: (next: string) => void
  setInventoryId: (next: string) => void
  setCut: (next: string) => void
  setIsWaste: (next: boolean) => void
  setNotes: (next: string) => void
  // --- actions ---
  /** Fires the appropriate mutation (create for drafts, update for saved). */
  commit: () => void
  /** Fires the destructive mutation (delete for PENDING, void for FINAL). */
  fireDestructive: () => void
  /** Drops a draft from the section state. No server effect. */
  discardDraft: () => void
}

export type PendingCutLogForm = {
  inventoryId: string
  /** UI-only — narrows the inventory dropdown to a chosen location. Not persisted. */
  locationFilterCode: string
  cut: string
  isWaste: boolean
  notes: string
}

const EMPTY_FORM: PendingCutLogForm = {
  inventoryId: "",
  locationFilterCode: "",
  cut: "",
  isWaste: false,
  notes: "",
}

type DraftRow = {
  kind: "draft"
  clientId: string
  form: PendingCutLogForm
}

type SavedRow = {
  kind: "saved"
  row: CutLogRow
  /** Local edits not yet committed. Empty when row is pristine. */
  edits: Partial<Pick<PendingCutLogForm, "cut" | "isWaste" | "notes">>
  /** UI-only filter; never sent to server. Persisted across edits for ergonomics. */
  locationFilterCode: string
}

type SectionRow = DraftRow | SavedRow

function toSavedRow(row: CutLogRow): SavedRow {
  return { kind: "saved", row, edits: {}, locationFilterCode: "" }
}

function rowId(row: SectionRow): string {
  return row.kind === "draft" ? row.clientId : row.row.id
}

function isSavedDirty(row: SavedRow): boolean {
  return Object.keys(row.edits).length > 0
}

function isDraftDirty(row: DraftRow): boolean {
  return (
    row.form.inventoryId !== "" ||
    row.form.cut !== "" ||
    row.form.isWaste !== false ||
    row.form.notes !== ""
  )
}

function buildSavedForm(row: SavedRow): PendingCutLogForm {
  return {
    inventoryId: row.row.inventoryId,
    locationFilterCode: row.locationFilterCode,
    cut: row.edits.cut ?? row.row.cut,
    isWaste: row.edits.isWaste ?? row.row.isWaste,
    notes: row.edits.notes ?? row.row.notes,
  }
}

/**
 * Section controller for the per-WOMI pending-cut-log row UI. Owns all
 * client state for the section: drafts, saved-row edits, the in-flight
 * row id, error map, and the "currently editing" pointer.
 *
 * Lifecycle in plain English:
 *   - User clicks "Add Pending Cut" → `addDraft()` appends a draft and
 *     marks it as the editing row.
 *   - User starts editing any row → `enterEditMode(rowId)` is called.
 *     If the previously-editing row was a saved row with edits, those
 *     edits are dropped (auto-discard). If the previously-editing row
 *     was a draft, it is removed entirely.
 *   - User clicks the circular commit button → `commit(rowId)` fires the
 *     create-or-update request. On success, the response patches local
 *     state and the row is no longer editing.
 *   - User clicks the destructive action button → opens the consumer's
 *     confirmation dialog. On confirm, `fireDestructive(rowId)` fires
 *     delete (PENDING) or void (FINAL). On success, the row is removed
 *     (delete) or transitioned to VOID (void).
 *
 * Reconciliation is callback-driven (no React Query invalidation): each
 * mutation response patches local state directly. This matches the
 * imports module's `useRecordScopedSectionController` pattern.
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
  const [rows, setRows] = useState<SectionRow[]>(() => initialRows.map(toSavedRow))
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [errorByRowId, setErrorByRowId] = useState<Record<string, string>>({})
  const [recentlySavedRowId, setRecentlySavedRowId] = useState<string | null>(null)

  // Replace local rows when the parent re-renders with fresh server rows
  // (e.g. after a record refresh on a sibling section). Drafts and dirty
  // edits are preserved if the row is still being edited.
  // (Implemented as a derived sync via `useMemo` would over-fire; left as
  // an SSR-initial-state convention. Parents pass a stable `initialRows`.)

  const findRow = useCallback(
    (id: string): SectionRow | undefined => rows.find((row) => rowId(row) === id),
    [rows],
  )

  const writeRow = useCallback((id: string, next: SectionRow) => {
    setRows((current) => current.map((row) => (rowId(row) === id ? next : row)))
  }, [])

  const dropRow = useCallback((id: string) => {
    setRows((current) => current.filter((row) => rowId(row) !== id))
  }, [])

  const setError = useCallback((id: string, message: string | null) => {
    setErrorByRowId((current) => {
      if (message === null) {
        if (!(id in current)) return current
        const { [id]: _drop, ...rest } = current
        return rest
      }
      return { ...current, [id]: message }
    })
  }, [])

  const enterEditMode = useCallback(
    (nextId: string | null) => {
      setEditingRowId((currentId) => {
        if (currentId === nextId) return currentId
        if (currentId !== null) {
          // Auto-discard the previously-editing row's local state.
          setRows((current) => {
            const previous = current.find((row) => rowId(row) === currentId)
            if (!previous) return current
            if (previous.kind === "draft") {
              return current.filter((row) => rowId(row) !== currentId)
            }
            // Saved row: drop edits but keep the row itself.
            return current.map((row) =>
              rowId(row) === currentId
                ? { ...(row as SavedRow), edits: {} }
                : row,
            )
          })
          setError(currentId, null)
        }
        return nextId
      })
    },
    [setError],
  )

  const addDraft = useCallback(() => {
    const clientId = crypto.randomUUID()
    setRows((current) => [
      ...current,
      { kind: "draft", clientId, form: { ...EMPTY_FORM } },
    ])
    enterEditMode(clientId)
  }, [enterEditMode])

  const discardDraft = useCallback(
    (id: string) => {
      setEditingRowId((current) => (current === id ? null : current))
      dropRow(id)
      setError(id, null)
    },
    [dropRow, setError],
  )

  const setField = useCallback(
    <K extends keyof PendingCutLogForm>(id: string, key: K, value: PendingCutLogForm[K]) => {
      // Editing any field auto-promotes the row to the section's editingRow.
      // If another row was previously the editing one, its local state is
      // discarded by `enterEditMode` — this is the auto-discard-on-click-off
      // semantics from the locked sweep decision.
      enterEditMode(id)
      setRows((current) =>
        current.map((row) => {
          if (rowId(row) !== id) return row
          if (row.kind === "draft") {
            return { ...row, form: { ...row.form, [key]: value } }
          }
          // Saved row.
          const saved = row as SavedRow
          if (key === "locationFilterCode") {
            return { ...saved, locationFilterCode: String(value ?? "") }
          }
          if (key === "inventoryId") {
            // inventoryId is immutable on saved rows; ignore.
            return saved
          }
          // cut / isWaste / notes — record as edit.
          const nextEdits = { ...saved.edits, [key]: value }
          // If the new value matches the server snapshot, drop the edit.
          const matchesServer =
            (key === "cut" && value === saved.row.cut) ||
            (key === "isWaste" && value === saved.row.isWaste) ||
            (key === "notes" && value === saved.row.notes)
          if (matchesServer) {
            const { [key]: _drop, ...rest } = nextEdits
            return { ...saved, edits: rest }
          }
          return { ...saved, edits: nextEdits }
        }),
      )
      setError(id, null)
      setRecentlySavedRowId((current) => (current === id ? null : current))
    },
    [enterEditMode, setError],
  )

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

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
      setRows((current) =>
        current.map((row) =>
          rowId(row) === clientId ? toSavedRow(response.cutLog) : row,
        ),
      )
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

  // -------------------------------------------------------------------------
  // Per-row controller projection
  // -------------------------------------------------------------------------

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
          setInventoryId: (next) => setField(id, "inventoryId", next),
          setCut: (next) => setField(id, "cut", next),
          setIsWaste: (next) => setField(id, "isWaste", next),
          setNotes: (next) => setField(id, "notes", next),
          commit: () => {
            if (!canCommit || isPendingMutation) return
            createMutation.mutate({ clientId: id, draft: row })
          },
          fireDestructive: () => {
            // Drafts: destructive action is "discard draft," same as discardDraft.
            discardDraft(id)
          },
          discardDraft: () => discardDraft(id),
        }
      }

      // Saved row.
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
    ],
  )

  const rowIds = useMemo(() => rows.map((row) => rowId(row)), [rows])

  return {
    rows,
    rowIds,
    editingRowId,
    addDraft,
    enterEditMode,
    discardDraft,
    getRowController,
  }
}

export type PendingCutLogSection = ReturnType<typeof usePendingCutLogSection>
