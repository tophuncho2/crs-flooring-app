"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  EMPTY_WAREHOUSE_FORM,
  toWarehouseForm,
  type WarehouseForm,
  type WarehouseListRow,
} from "@builders/domain"
import {
  createWarehouseRequest,
  deleteWarehouseRequest,
  updateWarehouseRequest,
} from "@/modules/warehouse/data/mutations"
import { WAREHOUSE_LIST_QUERY_KEY } from "@/modules/warehouse/data/list-warehouse-request"
import {
  normalizeRecordSectionError,
  type RecordSectionError,
} from "@/types/record/section-error"

export type WarehouseSidePanelOpenSpec =
  | { mode: "create" }
  | { mode: "edit"; warehouse: WarehouseListRow }

function formIsDirty(current: WarehouseForm, baseline: WarehouseForm): boolean {
  return (
    current.name !== baseline.name ||
    current.streetAddress !== baseline.streetAddress ||
    current.city !== baseline.city ||
    current.state !== baseline.state ||
    current.postalCode !== baseline.postalCode ||
    current.phone !== baseline.phone
  )
}

/**
 * Owns the warehouse side-panel lifecycle: open/close, current row, editable
 * form, dirty tracking, and the create / update / delete mutations. The panel
 * is a flat label / textarea form so the controller stays compact — no
 * pickers, no child collections, no per-section split.
 *
 * Mutation success invalidates `WAREHOUSE_LIST_QUERY_KEY` so the parent table
 * refetches and reflects the new row order (post-create) or removal
 * (post-delete) immediately.
 */
export function useWarehouseSidePanel() {
  const queryClient = useQueryClient()

  const [open, setOpen] = useState<WarehouseSidePanelOpenSpec | null>(null)
  const [form, setForm] = useState<WarehouseForm>(EMPTY_WAREHOUSE_FORM)
  const [baseline, setBaseline] = useState<WarehouseForm>(EMPTY_WAREHOUSE_FORM)
  const [error, setError] = useState<RecordSectionError | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  // Set the moment a create succeeds so the create→edit transition (which
  // re-runs the open effect) preserves the "created" notice instead of
  // clearing it like a fresh navigation would.
  const justCreatedRef = useRef(false)

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_WAREHOUSE_FORM)
      setBaseline(EMPTY_WAREHOUSE_FORM)
      setError(null)
      setSuccessMessage(null)
      justCreatedRef.current = false
      return
    }
    if (open.mode === "edit") {
      const next = toWarehouseForm(open.warehouse)
      setForm(next)
      setBaseline(next)
    } else {
      setForm(EMPTY_WAREHOUSE_FORM)
      setBaseline(EMPTY_WAREHOUSE_FORM)
    }
    setError(null)
    if (justCreatedRef.current) {
      justCreatedRef.current = false
    } else {
      setSuccessMessage(null)
    }
  }, [open])

  const isDirty = useMemo(() => formIsDirty(form, baseline), [form, baseline])

  const openCreate = useCallback(() => {
    setOpen({ mode: "create" })
  }, [])

  const openEdit = useCallback((warehouse: WarehouseListRow) => {
    setOpen({ mode: "edit", warehouse })
  }, [])

  const setField = useCallback(
    <K extends keyof WarehouseForm>(field: K, value: WarehouseForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setError(null)
      setSuccessMessage(null)
    },
    [],
  )

  const createMutation = useMutation({
    mutationFn: (input: WarehouseForm) => createWarehouseRequest(input),
    onSuccess: ({ warehouse }) => {
      const next = toWarehouseForm(warehouse)
      setForm(next)
      setBaseline(next)
      justCreatedRef.current = true
      setSuccessMessage("Warehouse created")
      setOpen({ mode: "edit", warehouse })
      void queryClient.invalidateQueries({ queryKey: [...WAREHOUSE_LIST_QUERY_KEY] })
    },
    onError: (err: unknown) => {
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to save warehouse" }))
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: { warehouse: WarehouseListRow; form: WarehouseForm }) =>
      updateWarehouseRequest(input.warehouse.id, input.form, input.warehouse.updatedAt),
    onSuccess: ({ warehouse }, _variables) => {
      const next = toWarehouseForm(warehouse)
      setForm(next)
      setBaseline(next)
      setOpen({ mode: "edit", warehouse })
      void queryClient.invalidateQueries({ queryKey: [...WAREHOUSE_LIST_QUERY_KEY] })
    },
    onError: (err: unknown) => {
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to save warehouse" }))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (warehouse: WarehouseListRow) =>
      deleteWarehouseRequest(warehouse.id, warehouse.updatedAt),
    onSuccess: () => {
      setOpen(null)
      void queryClient.invalidateQueries({ queryKey: [...WAREHOUSE_LIST_QUERY_KEY] })
    },
    onError: (err: unknown) => {
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to delete warehouse" }))
    },
  })

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending

  const isValid = form.name.trim().length > 0

  const save = useCallback(() => {
    if (!open || isSaving || !isValid) return
    if (open.mode === "create") {
      createMutation.mutate(form)
    } else {
      if (!isDirty) return
      updateMutation.mutate({ warehouse: open.warehouse, form })
    }
  }, [open, form, isDirty, isSaving, isValid, createMutation, updateMutation])

  const deleteWarehouse = useCallback(() => {
    if (!open || open.mode !== "edit" || isSaving) return
    deleteMutation.mutate(open.warehouse)
  }, [open, isSaving, deleteMutation])

  const discard = useCallback(() => {
    if (isSaving) return
    setForm(baseline)
    setError(null)
    setSuccessMessage(null)
  }, [isSaving, baseline])

  const close = useCallback(() => {
    if (isSaving) return
    setOpen(null)
  }, [isSaving])

  return {
    open,
    form,
    isDirty,
    isValid,
    isSaving,
    error,
    successMessage,
    openCreate,
    openEdit,
    close,
    setField,
    save,
    discard,
    deleteWarehouse,
  }
}

export type WarehouseSidePanelController = ReturnType<typeof useWarehouseSidePanel>
