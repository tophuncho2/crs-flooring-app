"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  toPropertyPrimaryForm,
  validatePropertyPrimaryForm,
  type PropertyDetailRecord,
  type PropertyPrimaryForm,
} from "@builders/domain"
import {
  PROPERTY_DETAIL_QUERY_KEY,
  getPropertyDetailRequest,
} from "@/modules/properties/data/property-detail-request"
import { EMPTY_FORM, buildFormFromRow, formIsDirty } from "./form"
import {
  useCreatePropertyMutation,
  useDeletePropertyMutation,
  useUpdatePropertyMutation,
} from "./mutations"
import type { PropertySidePanelMode, PropertySidePanelOpenSpec } from "./types"

/**
 * Owns the side-panel lifecycle for the properties list view: open/close,
 * current row, editable form, dirty tracking, plus create / update / delete
 * mutations.
 *
 * On edit the list row seeds the form immediately (so the panel opens
 * populated); a detail fetch then fills in `instructions` (not on the list
 * row) and refreshes `updatedAt`.
 *
 * Behaviour contract:
 *   - Save (create) → stay open, transition to edit mode for the new record.
 *   - Save (edit)   → stay open, refresh from server response.
 *   - Delete        → close panel.
 *   - Backdrop / ESC / X → close, discard unsaved.
 */
export function usePropertySidePanel() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState<PropertySidePanelOpenSpec | null>(null)
  const [recordId, setRecordId] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [managementCompanyLabel, setManagementCompanyLabel] = useState<string | null>(null)
  const [form, setForm] = useState<PropertyPrimaryForm>(EMPTY_FORM)
  const [baseline, setBaseline] = useState<PropertyPrimaryForm>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  const mode: PropertySidePanelMode | null =
    open === null ? null : recordId === null ? "create" : "edit"

  useEffect(() => {
    if (open === null) {
      setRecordId(null)
      setUpdatedAt(null)
      setManagementCompanyLabel(null)
      setForm(EMPTY_FORM)
      setBaseline(EMPTY_FORM)
      setError(null)
      return
    }
    if (open.mode === "create") {
      setRecordId(null)
      setUpdatedAt(null)
      setManagementCompanyLabel(null)
      setForm(EMPTY_FORM)
      setBaseline(EMPTY_FORM)
      setError(null)
    } else {
      const next = buildFormFromRow(open.row)
      setRecordId(open.row.id)
      setUpdatedAt(open.row.updatedAt)
      setManagementCompanyLabel(open.row.managementCompany?.name ?? null)
      setForm(next)
      setBaseline(next)
      setError(null)
    }
  }, [open])

  const detailQuery = useQuery<PropertyDetailRecord>({
    queryKey: [...PROPERTY_DETAIL_QUERY_KEY, recordId],
    queryFn: () => getPropertyDetailRequest(recordId as string),
    enabled: recordId !== null,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    const detail = detailQuery.data
    if (!detail || recordId === null) return
    const fromServer = toPropertyPrimaryForm(detail)
    setBaseline((previousBaseline) => {
      setForm((currentForm) => {
        if (formIsDirty(currentForm, previousBaseline)) return currentForm
        return fromServer
      })
      return fromServer
    })
    setUpdatedAt(detail.updatedAt)
    setManagementCompanyLabel(detail.managementCompany?.name ?? null)
  }, [detailQuery.data, recordId])

  const isDirty = useMemo(() => formIsDirty(form, baseline), [form, baseline])

  const validationError = useMemo(() => validatePropertyPrimaryForm(form), [form])

  const setField = useCallback(
    <K extends keyof PropertyPrimaryForm>(field: K, value: PropertyPrimaryForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setError(null)
    },
    [],
  )

  const setManagementCompany = useCallback((id: string | null, label: string | null) => {
    setForm((prev) => ({ ...prev, managementCompanyId: id ?? "" }))
    setManagementCompanyLabel(label)
    setError(null)
  }, [])

  const openPanel = useCallback((spec: PropertySidePanelOpenSpec) => {
    setOpen(spec)
  }, [])

  const createMutation = useCreatePropertyMutation({
    queryClient,
    setRecordId,
    setUpdatedAt,
    setManagementCompanyLabel,
    setForm,
    setBaseline,
    setError,
  })

  const updateMutation = useUpdatePropertyMutation({
    queryClient,
    setUpdatedAt,
    setManagementCompanyLabel,
    setForm,
    setBaseline,
    setError,
  })

  const deleteMutation = useDeletePropertyMutation({
    queryClient,
    setOpen,
    setError,
  })

  const isSaving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const canSave =
    validationError === "" &&
    isDirty &&
    !isSaving &&
    (mode === "create" || updatedAt !== null)

  const save = useCallback(() => {
    if (validationError !== "" || isSaving || !isDirty) return
    if (mode === "create") {
      createMutation.mutate(form)
    } else if (mode === "edit" && recordId !== null && updatedAt !== null) {
      updateMutation.mutate({ id: recordId, form, revisionKey: updatedAt })
    }
  }, [
    validationError,
    isSaving,
    isDirty,
    mode,
    recordId,
    updatedAt,
    form,
    createMutation,
    updateMutation,
  ])

  const deleteProperty = useCallback(() => {
    if (mode !== "edit" || recordId === null || updatedAt === null || isSaving) return
    deleteMutation.mutate({ id: recordId, updatedAt })
  }, [mode, recordId, updatedAt, isSaving, deleteMutation])

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
    mode,
    recordId,
    form,
    managementCompanyLabel,
    isDirty,
    isSaving,
    canSave,
    error,
    validationError: validationError === "" ? null : validationError,
    openPanel,
    close,
    setField,
    setManagementCompany,
    save,
    discard,
    deleteProperty,
  }
}

export type PropertySidePanelController = ReturnType<typeof usePropertySidePanel>
