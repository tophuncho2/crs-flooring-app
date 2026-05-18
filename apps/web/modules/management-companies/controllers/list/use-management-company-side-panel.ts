"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  toManagementCompanyForm,
  validateManagementCompanyForm,
  type ManagementCompanyDetail,
  type ManagementCompanyForm,
  type ManagementCompanyListRow,
} from "@builders/domain"
import {
  createManagementCompanyRequest,
  deleteManagementCompanyRequest,
  updateManagementCompanyRequest,
} from "@/modules/management-companies/data/mutations"
import {
  MANAGEMENT_COMPANY_DETAIL_QUERY_KEY,
  getManagementCompanyDetailRequest,
} from "@/modules/management-companies/data/management-company-detail-request"
import { MANAGEMENT_COMPANIES_LIST_QUERY_KEY } from "@/modules/management-companies/data/list-management-companies-request"

export type ManagementCompanySidePanelMode = "create" | "edit"

export type ManagementCompanySidePanelOpenSpec =
  | { mode: "create" }
  | { mode: "edit"; row: ManagementCompanyListRow }

const EMPTY_FORM: ManagementCompanyForm = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
}

function buildFormFromRow(row: ManagementCompanyListRow): ManagementCompanyForm {
  return {
    name: row.name,
    streetAddress: row.streetAddress,
    city: row.city,
    state: row.state,
    zip: row.zip,
    phone: row.phone,
    email: row.email,
  }
}

function formIsDirty(form: ManagementCompanyForm, baseline: ManagementCompanyForm): boolean {
  return (
    form.name !== baseline.name ||
    form.streetAddress !== baseline.streetAddress ||
    form.city !== baseline.city ||
    form.state !== baseline.state ||
    form.zip !== baseline.zip ||
    form.phone !== baseline.phone ||
    form.email !== baseline.email
  )
}

/**
 * Owns the side-panel lifecycle for the management-companies list view:
 * open/close, current row, editable form, dirty tracking, plus create /
 * update / delete mutations.
 *
 * Behaviour contract:
 *   - Save (create) → stay open, transition internally to edit mode for
 *     the newly created record (seeded from the response detail).
 *   - Save (edit)   → stay open, refresh form + baseline + updatedAt from
 *     server response.
 *   - Delete        → close panel.
 *   - Backdrop / ESC / X → close, discard unsaved.
 */
export function useManagementCompanySidePanel() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState<ManagementCompanySidePanelOpenSpec | null>(null)
  const [recordId, setRecordId] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [form, setForm] = useState<ManagementCompanyForm>(EMPTY_FORM)
  const [baseline, setBaseline] = useState<ManagementCompanyForm>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  const mode: ManagementCompanySidePanelMode | null =
    open === null ? null : recordId === null ? "create" : "edit"

  // Seed/reset when the open spec changes.
  useEffect(() => {
    if (open === null) {
      setRecordId(null)
      setUpdatedAt(null)
      setForm(EMPTY_FORM)
      setBaseline(EMPTY_FORM)
      setError(null)
      return
    }
    if (open.mode === "create") {
      setRecordId(null)
      setUpdatedAt(null)
      setForm(EMPTY_FORM)
      setBaseline(EMPTY_FORM)
      setError(null)
    } else {
      const next = buildFormFromRow(open.row)
      setRecordId(open.row.id)
      setUpdatedAt(open.row.updatedAt)
      setForm(next)
      setBaseline(next)
      setError(null)
    }
  }, [open])

  // Edit mode: fetch fresh detail so a stale list cache can't seed the form
  // with old values. Only reconciles when the user hasn't started editing.
  const detailQuery = useQuery<ManagementCompanyDetail>({
    queryKey: [...MANAGEMENT_COMPANY_DETAIL_QUERY_KEY, recordId],
    queryFn: () => getManagementCompanyDetailRequest(recordId as string),
    enabled: recordId !== null,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    const detail = detailQuery.data
    if (!detail || recordId === null) return
    const fromServer = toManagementCompanyForm(detail)
    setBaseline((previousBaseline) => {
      setForm((currentForm) => {
        if (formIsDirty(currentForm, previousBaseline)) return currentForm
        return fromServer
      })
      return fromServer
    })
    setUpdatedAt(detail.updatedAt)
  }, [detailQuery.data, recordId])

  const isDirty = useMemo(() => formIsDirty(form, baseline), [form, baseline])

  const validationError = useMemo(() => validateManagementCompanyForm(form), [form])

  const setField = useCallback(
    <K extends keyof ManagementCompanyForm>(field: K, value: ManagementCompanyForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setError(null)
    },
    [],
  )

  const openPanel = useCallback((spec: ManagementCompanySidePanelOpenSpec) => {
    setOpen(spec)
  }, [])

  const createMutation = useMutation({
    mutationFn: (input: ManagementCompanyForm) => createManagementCompanyRequest(input),
    onSuccess: (response) => {
      const detail = response.managementCompany
      const next = toManagementCompanyForm(detail)
      setRecordId(detail.id)
      setUpdatedAt(detail.updatedAt)
      setForm(next)
      setBaseline(next)
      setError(null)
      void queryClient.invalidateQueries({ queryKey: [...MANAGEMENT_COMPANIES_LIST_QUERY_KEY] })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; form: ManagementCompanyForm; revisionKey: string }) =>
      updateManagementCompanyRequest(input.id, input.form, input.revisionKey),
    onSuccess: (response) => {
      const detail = response.managementCompany
      const next = toManagementCompanyForm(detail)
      setUpdatedAt(detail.updatedAt)
      setForm(next)
      setBaseline(next)
      setError(null)
      void queryClient.invalidateQueries({ queryKey: [...MANAGEMENT_COMPANIES_LIST_QUERY_KEY] })
      void queryClient.invalidateQueries({
        queryKey: [...MANAGEMENT_COMPANY_DETAIL_QUERY_KEY, detail.id],
      })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (input: { id: string; updatedAt: string }) =>
      deleteManagementCompanyRequest(input.id, input.updatedAt),
    onSuccess: (_response, variables) => {
      setOpen(null)
      void queryClient.invalidateQueries({ queryKey: [...MANAGEMENT_COMPANIES_LIST_QUERY_KEY] })
      queryClient.removeQueries({
        queryKey: [...MANAGEMENT_COMPANY_DETAIL_QUERY_KEY, variables.id],
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

  const deleteCompany = useCallback(() => {
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
    isDirty,
    isSaving,
    canSave,
    error,
    validationError: validationError === "" ? null : validationError,
    openPanel,
    close,
    setField,
    save,
    discard,
    deleteCompany,
  }
}

export type ManagementCompanySidePanelController = ReturnType<
  typeof useManagementCompanySidePanel
>
