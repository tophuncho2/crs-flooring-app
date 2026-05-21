"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import { EMPTY_PROPERTY_PRIMARY_FORM, propertyFormIsDirty } from "./form"

export type UseHubPropertyEditArgs = {
  /** mode.propertyId when mode.kind === "section-edit-property"; otherwise null. */
  editingPropertyId: string | null
  clearError: () => void
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
  })

  // Reconcile from server detail. Preserves user edits.
  useEffect(() => {
    const detail = detailQuery.data
    if (!detail || editingPropertyId === null) return
    const fromServer = toPropertyPrimaryForm(detail)
    setBaseline((previousBaseline) => {
      setForm((currentForm) => {
        if (propertyFormIsDirty(currentForm, previousBaseline)) return currentForm
        return fromServer
      })
      return fromServer
    })
    setUpdatedAt(detail.updatedAt)
    setManagementCompanyLabel(detail.managementCompany?.name ?? null)
  }, [detailQuery.data, editingPropertyId])

  const isDirty = useMemo(() => propertyFormIsDirty(form, baseline), [form, baseline])
  const validation = useMemo(() => validatePropertyPrimaryForm(form), [form])

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
  }
}
