"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import {
  EMPTY_MANUFACTURER_FORM,
  toManufacturerForm,
  type ManufacturerForm,
  type ManufacturerRow,
} from "@builders/domain"
import {
  createManufacturerRequest,
  deleteManufacturerRequest,
  updateManufacturerRequest,
} from "@/modules/manufacturers/data/mutations"

export type ManufacturerSidePanelOpenSpec =
  | { mode: "create" }
  | { mode: "edit"; manufacturer: ManufacturerRow }

function formIsDirty(current: ManufacturerForm, baseline: ManufacturerForm): boolean {
  return (
    current.companyName !== baseline.companyName ||
    current.agentName !== baseline.agentName ||
    current.website !== baseline.website ||
    current.phone !== baseline.phone ||
    current.email !== baseline.email
  )
}

export function useManufacturerSidePanel() {
  const router = useRouter()

  const [open, setOpen] = useState<ManufacturerSidePanelOpenSpec | null>(null)
  const [form, setForm] = useState<ManufacturerForm>(EMPTY_MANUFACTURER_FORM)
  const [baseline, setBaseline] = useState<ManufacturerForm>(EMPTY_MANUFACTURER_FORM)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_MANUFACTURER_FORM)
      setBaseline(EMPTY_MANUFACTURER_FORM)
      setError(null)
      return
    }
    if (open.mode === "edit") {
      const next = toManufacturerForm(open.manufacturer)
      setForm(next)
      setBaseline(next)
    } else {
      setForm(EMPTY_MANUFACTURER_FORM)
      setBaseline(EMPTY_MANUFACTURER_FORM)
    }
    setError(null)
  }, [open])

  const isDirty = useMemo(() => formIsDirty(form, baseline), [form, baseline])

  const openCreate = useCallback(() => {
    setOpen({ mode: "create" })
  }, [])

  const openEdit = useCallback((manufacturer: ManufacturerRow) => {
    setOpen({ mode: "edit", manufacturer })
  }, [])

  const setField = useCallback(
    <K extends keyof ManufacturerForm>(field: K, value: ManufacturerForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setError(null)
    },
    [],
  )

  const createMutation = useMutation({
    mutationFn: (input: ManufacturerForm) => createManufacturerRequest(input),
    onSuccess: ({ manufacturer }) => {
      const next = toManufacturerForm(manufacturer)
      setForm(next)
      setBaseline(next)
      setOpen({ mode: "edit", manufacturer })
      router.refresh()
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: { manufacturer: ManufacturerRow; form: ManufacturerForm }) =>
      updateManufacturerRequest(input.manufacturer.id, input.form, input.manufacturer.updatedAt),
    onSuccess: ({ manufacturer }) => {
      const next = toManufacturerForm(manufacturer)
      setForm(next)
      setBaseline(next)
      setOpen({ mode: "edit", manufacturer })
      router.refresh()
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (manufacturer: ManufacturerRow) =>
      deleteManufacturerRequest(manufacturer.id, manufacturer.updatedAt),
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

  const isValid =
    form.companyName.trim().length > 0 || form.agentName.trim().length > 0

  const save = useCallback(() => {
    if (!open || isSaving || !isValid) return
    if (open.mode === "create") {
      createMutation.mutate(form)
    } else {
      if (!isDirty) return
      updateMutation.mutate({ manufacturer: open.manufacturer, form })
    }
  }, [open, form, isDirty, isSaving, isValid, createMutation, updateMutation])

  const deleteManufacturer = useCallback(() => {
    if (!open || open.mode !== "edit" || isSaving) return
    deleteMutation.mutate(open.manufacturer)
  }, [open, isSaving, deleteMutation])

  const discard = useCallback(() => {
    if (isSaving) return
    setForm(baseline)
    setError(null)
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
    openCreate,
    openEdit,
    close,
    setField,
    save,
    discard,
    deleteManufacturer,
  }
}

export type ManufacturerSidePanelController = ReturnType<typeof useManufacturerSidePanel>
