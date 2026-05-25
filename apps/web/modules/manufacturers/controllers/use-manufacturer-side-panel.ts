"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
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
import { MANUFACTURERS_LIST_QUERY_KEY } from "@/modules/manufacturers/data/list-manufacturers-request"
import {
  normalizeRecordSectionError,
  type RecordSectionError,
} from "@/types/record/section-error"

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
  const queryClient = useQueryClient()

  const [open, setOpen] = useState<ManufacturerSidePanelOpenSpec | null>(null)
  const [form, setForm] = useState<ManufacturerForm>(EMPTY_MANUFACTURER_FORM)
  const [baseline, setBaseline] = useState<ManufacturerForm>(EMPTY_MANUFACTURER_FORM)
  const [error, setError] = useState<RecordSectionError | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  // Set the moment a create succeeds so the create→edit transition (which
  // re-runs the open effect) preserves the "created" notice instead of
  // clearing it like a fresh navigation would.
  const justCreatedRef = useRef(false)

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_MANUFACTURER_FORM)
      setBaseline(EMPTY_MANUFACTURER_FORM)
      setError(null)
      setSuccessMessage(null)
      justCreatedRef.current = false
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

  const openEdit = useCallback((manufacturer: ManufacturerRow) => {
    setOpen({ mode: "edit", manufacturer })
  }, [])

  const setField = useCallback(
    <K extends keyof ManufacturerForm>(field: K, value: ManufacturerForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setError(null)
      setSuccessMessage(null)
    },
    [],
  )

  const createMutation = useMutation({
    mutationFn: (input: ManufacturerForm) => createManufacturerRequest(input),
    onSuccess: ({ manufacturer }) => {
      const next = toManufacturerForm(manufacturer)
      setForm(next)
      setBaseline(next)
      justCreatedRef.current = true
      setSuccessMessage("Manufacturer created")
      setOpen({ mode: "edit", manufacturer })
      void queryClient.invalidateQueries({ queryKey: [...MANUFACTURERS_LIST_QUERY_KEY] })
    },
    onError: (err: unknown) => {
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to save manufacturer" }))
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
      void queryClient.invalidateQueries({ queryKey: [...MANUFACTURERS_LIST_QUERY_KEY] })
    },
    onError: (err: unknown) => {
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to save manufacturer" }))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (manufacturer: ManufacturerRow) =>
      deleteManufacturerRequest(manufacturer.id, manufacturer.updatedAt),
    onSuccess: () => {
      setOpen(null)
      void queryClient.invalidateQueries({ queryKey: [...MANUFACTURERS_LIST_QUERY_KEY] })
    },
    onError: (err: unknown) => {
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to delete manufacturer" }))
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
    deleteManufacturer,
  }
}

export type ManufacturerSidePanelController = ReturnType<typeof useManufacturerSidePanel>
