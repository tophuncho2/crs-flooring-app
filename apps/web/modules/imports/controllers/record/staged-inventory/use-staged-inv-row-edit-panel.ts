"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import {
  describeStagedInventoryValidationIssues,
  EMPTY_STAGED_INVENTORY_FORM,
  toStagedInventoryForm,
  validateStagedInventoryForm,
  type StagedInventoryFilterRow,
  type StagedInventoryForm,
  type StagedInventoryRow,
} from "@builders/domain"
import {
  createStagedInventoryRowRequest,
  deleteStagedInventoryRowRequest,
  updateStagedInventoryRowRequest,
} from "@/modules/imports/data/mutations"
import type { StagedInvRowPanelPatch } from "./use-import-staged-inventory-section"

export type StagedInvRowEditPanelMode = "create" | "edit"

export type StagedInvRowEditPanelOpenSpec =
  | {
      mode: "create"
      filterRowId: string
      filterRowProductName: string
      filterRowStockUnitAbbrev: string
    }
  | {
      mode: "edit"
      row: StagedInventoryRow
      filterRow: StagedInventoryFilterRow
    }

function formIsDirty(current: StagedInventoryForm, baseline: StagedInventoryForm): boolean {
  return (
    current.rollNumber !== baseline.rollNumber ||
    current.startingStock !== baseline.startingStock ||
    current.dyeLot !== baseline.dyeLot ||
    current.location !== baseline.location ||
    current.note !== baseline.note
  )
}

/**
 * Owns the right-anchored side panel for staged-inventory-row editing:
 * open/close, current row, editable form, dirty tracking, and all
 * three per-row mutations (create / update / delete). Mirrors
 * `useCutLogEditPanel` shape — three inline `useMutation`s, publish a
 * patch to the parent on every success.
 *
 * Only DRAFT rows are editable. The host grid is responsible for not
 * opening the panel on QUEUED / IMPORTED rows (panel renders the row
 * read-only as a defensive fallback).
 *
 * Behavior contract:
 *   - Save (create) → close panel
 *   - Save (edit)   → close panel
 *   - Delete        → close panel
 *   - Backdrop / ESC / X → discard unsaved, close (blocked while saving)
 */
export function useStagedInvRowEditPanel({
  importId,
  publish,
}: {
  importId: string
  publish: (patch: StagedInvRowPanelPatch) => void
}) {
  const [open, setOpen] = useState<StagedInvRowEditPanelOpenSpec | null>(null)
  const [form, setForm] = useState<StagedInventoryForm>(EMPTY_STAGED_INVENTORY_FORM)
  const [baseline, setBaseline] = useState<StagedInventoryForm>(EMPTY_STAGED_INVENTORY_FORM)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_STAGED_INVENTORY_FORM)
      setBaseline(EMPTY_STAGED_INVENTORY_FORM)
      setError(null)
      return
    }
    if (open.mode === "edit") {
      const next = toStagedInventoryForm(open.row)
      setForm(next)
      setBaseline(next)
    } else {
      setForm(EMPTY_STAGED_INVENTORY_FORM)
      setBaseline(EMPTY_STAGED_INVENTORY_FORM)
    }
    setError(null)
  }, [open])

  const isDirty = useMemo(() => formIsDirty(form, baseline), [form, baseline])

  const openPanel = useCallback((spec: StagedInvRowEditPanelOpenSpec) => {
    setOpen(spec)
  }, [])

  const setField = useCallback(
    <K extends keyof StagedInventoryForm>(field: K, value: StagedInventoryForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setError(null)
    },
    [],
  )

  // --- mutations ---

  const createMutation = useMutation({
    mutationFn: (input: { filterRowId: string; form: StagedInventoryForm }) =>
      createStagedInventoryRowRequest({
        importId,
        filterRowId: input.filterRowId,
        form: input.form,
      }),
    onSuccess: (response) => {
      publish({ kind: "upsert", row: response.row, filterRow: response.filterRow })
      setOpen(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: { row: StagedInventoryRow; form: StagedInventoryForm }) =>
      updateStagedInventoryRowRequest({
        importId,
        rowId: input.row.id,
        form: input.form,
        expectedUpdatedAt: input.row.updatedAt,
      }),
    onSuccess: (response) => {
      publish({ kind: "upsert", row: response.row, filterRow: response.filterRow })
      setOpen(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (input: { row: StagedInventoryRow }) =>
      deleteStagedInventoryRowRequest({
        importId,
        rowId: input.row.id,
        expectedUpdatedAt: input.row.updatedAt,
      }),
    onSuccess: (response, variables) => {
      publish({
        kind: "delete",
        rowId: variables.row.id,
        filterRow: response.filterRow,
      })
      setOpen(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const isSaving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const isCreateValid = useCallback((value: StagedInventoryForm) => {
    return validateStagedInventoryForm(value).length === 0
  }, [])

  const save = useCallback(() => {
    if (!open || isSaving) return
    const issues = validateStagedInventoryForm(form)
    if (issues.length > 0) {
      setError(describeStagedInventoryValidationIssues(issues))
      return
    }
    if (open.mode === "create") {
      createMutation.mutate({ filterRowId: open.filterRowId, form })
    } else {
      if (!isDirty) return
      updateMutation.mutate({ row: open.row, form })
    }
  }, [open, form, isDirty, isSaving, createMutation, updateMutation])

  const deleteRow = useCallback(() => {
    if (!open || open.mode !== "edit" || isSaving) return
    deleteMutation.mutate({ row: open.row })
  }, [open, isSaving, deleteMutation])

  const close = useCallback(() => {
    if (isSaving) return
    setOpen(null)
  }, [isSaving])

  const canSave =
    open?.mode === "create" ? isCreateValid(form) : isDirty && isCreateValid(form)

  return {
    open,
    form,
    isDirty,
    isSaving,
    error,
    canSave,
    openPanel,
    close,
    setField,
    save,
    deleteRow,
  }
}

export type StagedInvRowEditPanelController = ReturnType<typeof useStagedInvRowEditPanel>
