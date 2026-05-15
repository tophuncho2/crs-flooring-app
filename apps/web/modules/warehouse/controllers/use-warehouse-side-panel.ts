"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import {
  EMPTY_WAREHOUSE_FORM,
  toWarehouseForm,
  type WarehouseForm,
} from "@builders/domain"
import type { WarehouseRecord } from "@builders/db"
import {
  createWarehouseRequest,
  deleteWarehouseRequest,
  updateWarehouseRequest,
} from "@/modules/warehouse/data/mutations"

export type WarehouseSidePanelOpenSpec =
  | { mode: "create" }
  | { mode: "edit"; warehouse: WarehouseRecord }

function formIsDirty(current: WarehouseForm, baseline: WarehouseForm): boolean {
  return (
    current.name !== baseline.name ||
    current.address !== baseline.address ||
    current.phone !== baseline.phone
  )
}

/**
 * Owns the warehouse side-panel lifecycle: open/close, current row, editable
 * form, dirty tracking, and the create / update / delete mutations. The panel
 * is a flat label / textarea form so the controller stays compact — no
 * pickers, no child collections, no per-section split.
 *
 * Mutation success refreshes the SSR list via `router.refresh()` so the
 * parent table sees the new row order (post-create) or removal (post-delete)
 * without a full page navigation.
 */
export function useWarehouseSidePanel() {
  const router = useRouter()

  const [open, setOpen] = useState<WarehouseSidePanelOpenSpec | null>(null)
  const [form, setForm] = useState<WarehouseForm>(EMPTY_WAREHOUSE_FORM)
  const [baseline, setBaseline] = useState<WarehouseForm>(EMPTY_WAREHOUSE_FORM)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_WAREHOUSE_FORM)
      setBaseline(EMPTY_WAREHOUSE_FORM)
      setError(null)
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
  }, [open])

  const isDirty = useMemo(() => formIsDirty(form, baseline), [form, baseline])

  const openCreate = useCallback(() => {
    setOpen({ mode: "create" })
  }, [])

  const openEdit = useCallback((warehouse: WarehouseRecord) => {
    setOpen({ mode: "edit", warehouse })
  }, [])

  const setField = useCallback(
    <K extends keyof WarehouseForm>(field: K, value: WarehouseForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setError(null)
    },
    [],
  )

  const createMutation = useMutation({
    mutationFn: (input: WarehouseForm) => createWarehouseRequest(input),
    onSuccess: ({ warehouse }) => {
      const next = toWarehouseForm(warehouse)
      setForm(next)
      setBaseline(next)
      setOpen({ mode: "edit", warehouse })
      router.refresh()
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: { warehouse: WarehouseRecord; form: WarehouseForm }) =>
      updateWarehouseRequest(input.warehouse.id, input.form, input.warehouse.updatedAt),
    onSuccess: ({ warehouse }, _variables) => {
      const next = toWarehouseForm(warehouse)
      setForm(next)
      setBaseline(next)
      setOpen({ mode: "edit", warehouse })
      router.refresh()
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (warehouse: WarehouseRecord) =>
      deleteWarehouseRequest(warehouse.id, warehouse.updatedAt),
    onSuccess: () => {
      setOpen(null)
      router.refresh()
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
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
    openCreate,
    openEdit,
    close,
    setField,
    save,
    deleteWarehouse,
  }
}

export type WarehouseSidePanelController = ReturnType<typeof useWarehouseSidePanel>
