"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  CreatePropertyHubForm,
  ManagementCompanyDetail,
  PropertyDetailRecord,
} from "@builders/domain"
import { MANAGEMENT_COMPANIES_LIST_QUERY_KEY } from "@/modules/management-companies/data/list-management-companies-request"
import { MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY } from "@/modules/management-companies/data/management-company-options-request"
import { PROPERTIES_LIST_QUERY_KEY } from "@/modules/properties/data/list-properties-request"
import { createPropertyHubRequest } from "@/modules/properties/data/mutations"

export type PropertyHubCreateResult = {
  property: PropertyDetailRecord | null
  managementCompany: ManagementCompanyDetail | null
}

/**
 * Mutation hook for the "+ Hub" create flow. Invalidates the list and
 * options caches on success; consumers handle the panel close + reset and
 * any post-create navigation via `onSuccess` / `onError` overrides on the
 * call site (the controller does this).
 */
export function useCreatePropertyHubMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreatePropertyHubForm) => createPropertyHubRequest(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...PROPERTIES_LIST_QUERY_KEY] })
      void queryClient.invalidateQueries({
        queryKey: [...MANAGEMENT_COMPANIES_LIST_QUERY_KEY],
      })
      void queryClient.invalidateQueries({
        queryKey: [...MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY],
      })
    },
  })
}
