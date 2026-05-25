"use client"

import { useCallback, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  toManagementCompanyForm,
  validateManagementCompanyForm,
  type ManagementCompanyDetail,
  type ManagementCompanyForm,
} from "@builders/domain"
import { MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY } from "@/modules/management-companies/data/management-company-options-request"
import { EMPTY_MC_FORM, mcFormIsDirty } from "./form"
import { useDeleteMcMutation, useUpdateMcMutation } from "./mutations"

export type UseHubMcEditArgs = {
  /** True when current mode is section-edit-mc; gates the reconcile effect. */
  isActive: boolean
  /** Fetched MC detail from the coordinator's detail query. */
  detail: ManagementCompanyDetail | null | undefined
  clearError: () => void
}

export type CommitMcUpdateCallbacks = {
  onSuccess?: (detail: ManagementCompanyDetail) => void
  onError?: (error: unknown) => void
}

export type CommitMcDeleteCallbacks = {
  onSuccess?: () => void
  onError?: (error: unknown) => void
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
  /** Combined isPending for update + delete (the slice's mutations). */
  isPending: boolean
  /**
   * Dispatch updateMc with the current form + updatedAt revision. On success,
   * applies the server snapshot to this slice's state and fires `onSuccess`
   * with the returned detail (caller handles mode transition).
   */
  commitUpdate: (mcId: string, callbacks: CommitMcUpdateCallbacks) => void
  /**
   * Dispatch deleteMc with the current updatedAt revision. On success,
   * invalidates the MC-options cache (the mutation hook already invalidates
   * the list cache) and fires `onSuccess`.
   */
  commitDelete: (mcId: string, callbacks: CommitMcDeleteCallbacks) => void
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

  // Reconcile baseline + form from the server detail — derived during render.
  // Preserves user edits; otherwise pulls the freshest values. (`detail` is a
  // stable ref — the old effect's setBaseline(fromServer) would already loop
  // otherwise.)
  const [reconciled, setReconciled] = useState({ isActive, detail })
  if (reconciled.isActive !== isActive || reconciled.detail !== detail) {
    setReconciled({ isActive, detail })
    if (isActive && detail) {
      const fromServer = toManagementCompanyForm(detail)
      if (!mcFormIsDirty(form, baseline)) setForm(fromServer)
      setBaseline(fromServer)
      setUpdatedAt(detail.updatedAt)
    }
  }

  const isDirty = useMemo(() => mcFormIsDirty(form, baseline), [form, baseline])
  const validation = useMemo(() => validateManagementCompanyForm(form), [form])

  // ===== Mutations =====
  const queryClient = useQueryClient()
  const updateMutation = useUpdateMcMutation()
  const deleteMutation = useDeleteMcMutation()
  const isPending = updateMutation.isPending || deleteMutation.isPending

  const commitUpdate = useCallback(
    (mcId: string, { onSuccess, onError }: CommitMcUpdateCallbacks) => {
      if (updatedAt === null) return
      updateMutation.mutate(
        { id: mcId, form, revisionKey: updatedAt },
        {
          onSuccess: (response) => {
            const detail = response.managementCompany
            applyServerSnapshot(toManagementCompanyForm(detail), detail.updatedAt)
            onSuccess?.(detail)
          },
          onError: (err) => onError?.(err),
        },
      )
    },
    [updateMutation, form, updatedAt, applyServerSnapshot],
  )

  const commitDelete = useCallback(
    (mcId: string, { onSuccess, onError }: CommitMcDeleteCallbacks) => {
      if (updatedAt === null) return
      deleteMutation.mutate(
        { id: mcId, updatedAt },
        {
          onSuccess: () => {
            // The mutation hook already invalidates the list + removes the
            // detail; we additionally invalidate the MC-options cache so
            // pickers across the app stop showing the deleted MC.
            void queryClient.invalidateQueries({
              queryKey: [...MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY],
            })
            onSuccess?.()
          },
          onError: (err) => onError?.(err),
        },
      )
    },
    [deleteMutation, updatedAt, queryClient],
  )

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
    isPending,
    commitUpdate,
    commitDelete,
  }
}
