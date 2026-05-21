"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  toManagementCompanyForm,
  validateManagementCompanyForm,
  type ManagementCompanyDetail,
  type ManagementCompanyForm,
} from "@builders/domain"
import { EMPTY_MC_FORM, mcFormIsDirty } from "./form"

export type UseHubMcEditArgs = {
  /** True when current mode is section-edit-mc; gates the reconcile effect. */
  isActive: boolean
  /** Fetched MC detail from the coordinator's detail query. */
  detail: ManagementCompanyDetail | null | undefined
  clearError: () => void
}

export type HubMcEditSlice = {
  form: ManagementCompanyForm
  baseline: ManagementCompanyForm
  updatedAt: string | null
  isDirty: boolean
  validation: string
  setField: <K extends keyof ManagementCompanyForm>(
    field: K,
    value: ManagementCompanyForm[K],
  ) => void
  reset: () => void
  /** Discard — revert form to baseline. */
  resetToBaseline: () => void
  /** After a successful save: replace form + baseline + updatedAt from the server. */
  applyServerSnapshot: (form: ManagementCompanyForm, updatedAt: string) => void
  /** After openForMcEdit: seed form + baseline + updatedAt from a list row. */
  hydrateFromRow: (form: ManagementCompanyForm, updatedAt: string) => void
}

/**
 * MC section-edit slice. Owns the editable MC form, its baseline (for
 * dirty + discard), and the row-revision token used for optimistic-locking
 * updates. Reconciles from the detail query when not dirty.
 */
export function useHubMcEdit({
  isActive,
  detail,
  clearError,
}: UseHubMcEditArgs): HubMcEditSlice {
  const [form, setForm] = useState<ManagementCompanyForm>(EMPTY_MC_FORM)
  const [baseline, setBaseline] = useState<ManagementCompanyForm>(EMPTY_MC_FORM)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const reset = useCallback(() => {
    setForm(EMPTY_MC_FORM)
    setBaseline(EMPTY_MC_FORM)
    setUpdatedAt(null)
  }, [])

  const resetToBaseline = useCallback(() => {
    setForm(baseline)
  }, [baseline])

  const setField = useCallback(
    <K extends keyof ManagementCompanyForm>(field: K, value: ManagementCompanyForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      clearError()
    },
    [clearError],
  )

  const applyServerSnapshot = useCallback(
    (next: ManagementCompanyForm, nextUpdatedAt: string) => {
      setForm(next)
      setBaseline(next)
      setUpdatedAt(nextUpdatedAt)
    },
    [],
  )

  const hydrateFromRow = useCallback(
    (next: ManagementCompanyForm, nextUpdatedAt: string) => {
      setForm(next)
      setBaseline(next)
      setUpdatedAt(nextUpdatedAt)
    },
    [],
  )

  // Reconcile baseline + form from the server detail. Preserves user edits.
  useEffect(() => {
    if (!isActive) return
    if (!detail) return
    const fromServer = toManagementCompanyForm(detail)
    setBaseline((previousBaseline) => {
      setForm((currentForm) => {
        if (mcFormIsDirty(currentForm, previousBaseline)) return currentForm
        return fromServer
      })
      return fromServer
    })
    setUpdatedAt(detail.updatedAt)
  }, [isActive, detail])

  const isDirty = useMemo(() => mcFormIsDirty(form, baseline), [form, baseline])
  const validation = useMemo(() => validateManagementCompanyForm(form), [form])

  return {
    form,
    baseline,
    updatedAt,
    isDirty,
    validation,
    setField,
    reset,
    resetToBaseline,
    applyServerSnapshot,
    hydrateFromRow,
  }
}
