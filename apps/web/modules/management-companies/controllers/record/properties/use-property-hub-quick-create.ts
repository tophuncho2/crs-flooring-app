"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  EMPTY_MANAGEMENT_COMPANY_FORM,
  EMPTY_PROPERTY_HUB_PROPERTY_FIELDS,
  validateCreatePropertyHubForm,
  type ManagementCompanyDetail,
  type PropertyDetailRecord,
} from "@builders/domain"
import { createPropertyHubRequest } from "@/modules/management-companies/data/properties/property-mutations"
import { PROPERTIES_LIST_QUERY_KEY } from "@/modules/properties/data/list-properties-request"
import { MANAGEMENT_COMPANIES_LIST_QUERY_KEY } from "@/modules/management-companies/data/list-management-companies-request"
import { MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY } from "@/modules/management-companies/data/management-company-options-request"
import {
  buildHubCreatePayload,
  type PropertyHubCreateForm,
} from "./use-property-hub-create-section"

export type PropertyHubQuickCreateResult = {
  property: PropertyDetailRecord | null
  managementCompany: ManagementCompanyDetail | null
}

/**
 * The modal-mounted sibling of {@link usePropertyHubCreateSection}: drives the
 * trimmed quick-create form inside a record view. Unlike the page controller it
 * does **not** navigate on success — it returns the created records so the host
 * can fill the originating cell. Reuses the page controller's payload builder
 * (`buildHubCreatePayload`) and domain validator so both forms post an identical
 * `/api/properties/hub` shape.
 */
export function usePropertyHubQuickCreate({
  initialManagementCompany,
}: {
  /** Pre-link an existing MC (e.g. the record view already has one selected). */
  initialManagementCompany?: { id: string; label: string | null } | null
} = {}) {
  const queryClient = useQueryClient()

  const [localValue, setLocalValue] = useState<PropertyHubCreateForm>(() => ({
    mcLinkId: initialManagementCompany?.id ?? null,
    mcLinkLabel: initialManagementCompany?.label ?? null,
    mcForm: EMPTY_MANAGEMENT_COMPANY_FORM,
    propertyForm: EMPTY_PROPERTY_HUB_PROPERTY_FIELDS,
  }))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canCreate = localValue.propertyForm.name.trim().length > 0

  async function save(): Promise<PropertyHubQuickCreateResult | null> {
    const payload = buildHubCreatePayload(localValue)

    const validationError = validateCreatePropertyHubForm(payload)
    if (validationError) {
      setError(validationError)
      return null
    }

    setIsSaving(true)
    setError(null)
    try {
      const result = await createPropertyHubRequest(payload)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PROPERTIES_LIST_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: MANAGEMENT_COMPANIES_LIST_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY }),
      ])

      return result
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to create property")
      return null
    } finally {
      setIsSaving(false)
    }
  }

  return { localValue, setLocalValue, isSaving, error, canCreate, save }
}
