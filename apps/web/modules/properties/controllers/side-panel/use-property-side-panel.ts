"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  toPropertyPrimaryForm,
  validatePropertyPrimaryForm,
  type PropertyDetailRecord,
  type PropertyListRow,
  type PropertyPrimaryForm,
} from "@builders/domain"
import {
  createPropertyRequest,
  deletePropertyRequest,
  updatePropertyRequest,
} from "@/modules/properties/data/mutations"
import {
  PROPERTY_DETAIL_QUERY_KEY,
  getPropertyDetailRequest,
} from "@/modules/properties/data/property-detail-request"
import { PROPERTIES_LIST_QUERY_KEY } from "@/modules/properties/data/list-properties-request"

export type PropertySidePanelMode = "create" | "edit"

export type PropertySidePanelOpenSpec =
  | { mode: "create" }
  | { mode: "edit"; row: PropertyListRow }

const EMPTY_FORM: PropertyPrimaryForm = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  instructions: "",
  managementCompanyId: "",
}

function buildFormFromRow(row: PropertyListRow): PropertyPrimaryForm {
  return {
    name: row.name,
    streetAddress: row.streetAddress,
    city: row.city,
    state: row.state,
    zip: row.zip,
    phone: row.phone,
    email: row.email,
    // List row does not include `instructions`; detail fetch fills it in.
    instructions: "",
    managementCompanyId: row.managementCompany?.id ?? "",
  }
}

function formIsDirty(form: PropertyPrimaryForm, baseline: PropertyPrimaryForm): boolean {
  return (
    form.name !== baseline.name ||
    form.streetAddress !== baseline.streetAddress ||
    form.city !== baseline.city ||
    form.state !== baseline.state ||
    form.zip !== baseline.zip ||
    form.phone !== baseline.phone ||
    form.email !== baseline.email ||
    form.instructions !== baseline.instructions ||
    form.managementCompanyId !== baseline.managementCompanyId
  )
}

/**
 * Owns the side-panel lifecycle for the properties list view: open/close,
 * current row, editable form, dirty tracking, plus create / update / delete
 * mutations.
 *
 * On edit the list row seeds the form immediately (so the panel opens
 * populated); a detail fetch then fills in `instructions` (not on the list
 * row) and refreshes `updatedAt`.
 *
 * Behaviour contract mirrors the management-company side panel:
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

  const setManagementCompany = useCallback(
    (id: string | null, label: string | null) => {
      setForm((prev) => ({ ...prev, managementCompanyId: id ?? "" }))
      setManagementCompanyLabel(label)
      setError(null)
    },
    [],
  )

  const openPanel = useCallback((spec: PropertySidePanelOpenSpec) => {
    setOpen(spec)
  }, [])

  const createMutation = useMutation({
    mutationFn: (input: PropertyPrimaryForm) => createPropertyRequest(input),
    onSuccess: (response) => {
      const detail = response.property
      const next = toPropertyPrimaryForm(detail)
      setRecordId(detail.id)
      setUpdatedAt(detail.updatedAt)
      setManagementCompanyLabel(detail.managementCompany?.name ?? null)
      setForm(next)
      setBaseline(next)
      setError(null)
      void queryClient.invalidateQueries({ queryKey: [...PROPERTIES_LIST_QUERY_KEY] })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; form: PropertyPrimaryForm; revisionKey: string }) =>
      updatePropertyRequest(input.id, input.form, input.revisionKey),
    onSuccess: (response) => {
      const detail = response.property
      const next = toPropertyPrimaryForm(detail)
      setUpdatedAt(detail.updatedAt)
      setManagementCompanyLabel(detail.managementCompany?.name ?? null)
      setForm(next)
      setBaseline(next)
      setError(null)
      void queryClient.invalidateQueries({ queryKey: [...PROPERTIES_LIST_QUERY_KEY] })
      void queryClient.invalidateQueries({
        queryKey: [...PROPERTY_DETAIL_QUERY_KEY, detail.id],
      })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (input: { id: string; updatedAt: string }) =>
      deletePropertyRequest(input.id, input.updatedAt),
    onSuccess: (_response, variables) => {
      setOpen(null)
      void queryClient.invalidateQueries({ queryKey: [...PROPERTIES_LIST_QUERY_KEY] })
      queryClient.removeQueries({
        queryKey: [...PROPERTY_DETAIL_QUERY_KEY, variables.id],
      })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
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
