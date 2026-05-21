"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type ManagementCompanyForm } from "@builders/domain"
import { updateManagementCompanyRequest } from "@/modules/management-companies/data/mutations"
import { MANAGEMENT_COMPANIES_LIST_QUERY_KEY } from "@/modules/management-companies/data/list-management-companies-request"
import { MANAGEMENT_COMPANY_DETAIL_QUERY_KEY } from "@/modules/management-companies/data/management-company-detail-request"

export type UpdateMcMutationInput = {
  id: string
  form: ManagementCompanyForm
  revisionKey: string
}

export function useUpdateMcMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateMcMutationInput) =>
      updateManagementCompanyRequest(input.id, input.form, input.revisionKey),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: [...MANAGEMENT_COMPANIES_LIST_QUERY_KEY] })
      void queryClient.invalidateQueries({
        queryKey: [...MANAGEMENT_COMPANY_DETAIL_QUERY_KEY, response.managementCompany.id],
      })
    },
  })
}
