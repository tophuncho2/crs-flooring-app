"use client"

import { useCallback, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
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
import { FRESH_ON_OPEN } from "@/query-policies"
import { EMPTY_PROPERTY_PRIMARY_FORM, propertyFormIsDirty } from "./form"
import { useDeletePropertyMutation, useUpdatePropertyMutation } from "./mutations"

export type UseHubPropertyEditArgs = {
  /** mode.propertyId when mode.kind === "section-edit-property"; otherwise null. */
  editingPropertyId: string | null
  clearError: () => void
}

export type CommitPropertyUpdateCallbacks = {
  onSuccess?: (detail: PropertyDetailRecord) => void
  onError?: (error: unknown) => void
}

export type CommitPropertyDeleteCallbacks = {
  onSuccess?: () => void
  onError?: (error: unknown) => void
}

export type HubPropertyEditSlice = {
  form: PropertyPrimaryForm
  baseline: PropertyPrimaryForm
  updatedAt: string | null
  managementCompanyLabel: string | null
  isDirty: boolean
  validation: string
  setField: <K extends keyof PropertyPrimaryForm>(
    field: K,
    value: PropertyPrimaryForm[K],
  ) => void
  setManagementCompany: (id: string | null, label: string | null) => void
  reset: () => void
  /** Discard — revert form to baseline. Preserves the MC label. */
  resetToBaseline: () => void
  applyServerSnapshot: (
    form: PropertyPrimaryForm,
    updatedAt: string,
    mcLabel: string | null,
  ) => void
  hydrateFromRow: (
    form: PropertyPrimaryForm,
    updatedAt: string,
    mcLabel: string | null,
  ) => void
  /** Combined isPending for update + delete (the slice's mutations). */
  isPending: boolean
  /**
   * Dispatch updateProperty with the current form + updatedAt revision. On
   * success, applies the server snapshot to this slice's state and fires
   * `onSuccess` with the returned detail (caller handles mode transition).
   */
  commitUpdate: (
    propertyId: string,
    callbacks: CommitPropertyUpdateCallbacks,
  ) => void
  /**
   * Dispatch deleteProperty with the current updatedAt revision. The
   * mutation hook already invalidates the properties list cache.
   */
  commitDelete: (
    propertyId: string,
    callbacks: CommitPropertyDeleteCallbacks,
  ) => void
}

/**
 * Property section-edit slice. Owns the editable property form, baseline,
 * row revision, and the MC label rendered in the property-edit MC chip.
 * Also runs the property-detail query for `editingPropertyId` and reconciles
 * the form when the user hasn't edited.
 */
export function useHubPropertyEdit({
  editingPropertyId,
  clearError,
}: UseHubPropertyEditArgs): HubPropertyEditSlice {
  const [form, setForm] = useState<PropertyPrimaryForm>(EMPTY_PROPERTY_PRIMARY_FORM)
  const [baseline, setBaseline] = useState<PropertyPrimaryForm>(EMPTY_PROPERTY_PRIMARY_FORM)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [managementCompanyLabel, setManagementCompanyLabel] = useState<string | null>(null)

  const reset = useCallback(() => {
    setForm(EMPTY_PROPERTY_PRIMARY_FORM)
    setBaseline(EMPTY_PROPERTY_PRIMARY_FORM)
    setUpdatedAt(null)
    setManagementCompanyLabel(null)
  }, [])

  const resetToBaseline = useCallback(() => {
    setForm(baseline)
  }, [baseline])

  const setField = useCallback(
    <K extends keyof PropertyPrimaryForm>(field: K, value: PropertyPrimaryForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      clearError()
    },
    [clearError],
  )

  const setManagementCompany = useCallback(
    (id: string | null, label: string | null) => {
      setForm((prev) => ({ ...prev, managementCompanyId: id ?? "" }))
      setManagementCompanyLabel(label)
      clearError()
    },
    [clearError],
  )

  const applyServerSnapshot = useCallback(
    (next: PropertyPrimaryForm, nextUpdatedAt: string, mcLabel: string | null) => {
      setForm(next)
      setBaseline(next)
      setUpdatedAt(nextUpdatedAt)
      setManagementCompanyLabel(mcLabel)
    },
    [],
  )

  const hydrateFromRow = useCallback(
    (next: PropertyPrimaryForm, nextUpdatedAt: string, mcLabel: string | null) => {
      setForm(next)
      setBaseline(next)
      setUpdatedAt(nextUpdatedAt)
      setManagementCompanyLabel(mcLabel)
    },
    [],
  )

  const detailQuery = useQuery<PropertyDetailRecord>({
    queryKey: [...PROPERTY_DETAIL_QUERY_KEY, editingPropertyId],
    queryFn: () => getPropertyDetailRequest(editingPropertyId as string),
    enabled: editingPropertyId !== null,
    refetchOnWindowFocus: false,
    ...FRESH_ON_OPEN,
  })

  // Reconcile from server detail — derived during render. Preserves user edits,
  // including the MC label, which would otherwise revert a dirty pick back to
  // the saved server name on any incidental refetch. (detailQuery.data is a
  // stable ref via react-query structural sharing.)
  const detailData = detailQuery.data
  const [reconciled, setReconciled] = useState({ data: detailData, editingPropertyId })
  if (reconciled.data !== detailData || reconciled.editingPropertyId !== editingPropertyId) {
    setReconciled({ data: detailData, editingPropertyId })
    if (detailData && editingPropertyId !== null) {
      const fromServer = toPropertyPrimaryForm(detailData)
      const wasDirty = propertyFormIsDirty(form, baseline)
      if (!wasDirty) setForm(fromServer)
      setBaseline(fromServer)
      setUpdatedAt(detailData.updatedAt)
      if (!wasDirty) {
        setManagementCompanyLabel(detailData.managementCompany?.name ?? null)
      }
    }
  }

  const isDirty = useMemo(() => propertyFormIsDirty(form, baseline), [form, baseline])
  const validation = useMemo(() => validatePropertyPrimaryForm(form), [form])

  // ===== Mutations =====
  const updateMutation = useUpdatePropertyMutation()
  const deleteMutation = useDeletePropertyMutation()
  const isPending = updateMutation.isPending || deleteMutation.isPending

  const commitUpdate = useCallback(
    (propertyId: string, { onSuccess, onError }: CommitPropertyUpdateCallbacks) => {
      if (updatedAt === null) return
      updateMutation.mutate(
        { id: propertyId, form, revisionKey: updatedAt },
        {
          onSuccess: (response) => {
            const detail = response.property
            applyServerSnapshot(
              toPropertyPrimaryForm(detail),
              detail.updatedAt,
              detail.managementCompany?.name ?? null,
            )
            onSuccess?.(detail)
          },
          onError: (err) => onError?.(err),
        },
      )
    },
    [updateMutation, form, updatedAt, applyServerSnapshot],
  )

  const commitDelete = useCallback(
    (propertyId: string, { onSuccess, onError }: CommitPropertyDeleteCallbacks) => {
      if (updatedAt === null) return
      deleteMutation.mutate(
        { id: propertyId, updatedAt },
        {
          onSuccess: () => onSuccess?.(),
          onError: (err) => onError?.(err),
        },
      )
    },
    [deleteMutation, updatedAt],
  )

  return {
    form,
    baseline,
    updatedAt,
    managementCompanyLabel,
    isDirty,
    validation,
    setField,
    setManagementCompany,
    reset,
    resetToBaseline,
    applyServerSnapshot,
    hydrateFromRow,
    isPending,
    commitUpdate,
    commitDelete,
  }
}
