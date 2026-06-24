"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  EMPTY_MANAGEMENT_COMPANY_FORM,
  validateManagementCompanyForm,
  type ManagementCompanyDetail,
  type ManagementCompanyForm,
} from "@builders/domain"
import { createManagementCompanyRequest } from "@/modules/management-companies/data/mutations"
import { MANAGEMENT_COMPANIES_LIST_QUERY_KEY } from "@/modules/management-companies/data/list-management-companies-request"
import { MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY } from "@/modules/management-companies/data/management-company-options-request"

export type ManagementCompanyQuickCreateResult = {
  managementCompany: ManagementCompanyDetail | null
}

/**
 * The modal-mounted controller for the lean MC quick-create: drives a single
 * {@link ManagementCompanyForm} (Company Name + optional contact/address), creates
 * via `/api/management-companies`, and — unlike the full create page — does **not**
 * navigate. It returns the created `ManagementCompanyDetail` so the host can fill
 * its originating cell, and invalidates the MC list + options queries so every
 * picker/list sees the new company.
 */
export function useManagementCompanyQuickCreate() {
  const queryClient = useQueryClient()

  const [localValue, setLocalValue] = useState<ManagementCompanyForm>(
    () => EMPTY_MANAGEMENT_COMPANY_FORM,
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canCreate = localValue.name.trim().length > 0

  async function save(): Promise<ManagementCompanyQuickCreateResult | null> {
    const validationError = validateManagementCompanyForm(localValue)
    if (validationError) {
      setError(validationError)
      return null
    }

    setIsSaving(true)
    setError(null)
    try {
      const result = await createManagementCompanyRequest(localValue)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: MANAGEMENT_COMPANIES_LIST_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY }),
      ])

      return result
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to create management company",
      )
      return null
    } finally {
      setIsSaving(false)
    }
  }

  return { localValue, setLocalValue, isSaving, error, canCreate, save }
}
