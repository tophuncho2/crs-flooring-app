"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteManagementCompanyRequest } from "@/modules/management-companies/data/mutations"
import { MANAGEMENT_COMPANIES_LIST_QUERY_KEY } from "@/modules/management-companies/data/list-management-companies-request"
import { MANAGEMENT_COMPANY_DETAIL_QUERY_KEY } from "@/modules/management-companies/data/management-company-detail-request"

export type DeleteMcMutationInput = { id: string; updatedAt: string }

export function useDeleteMcMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: DeleteMcMutationInput) =>
      deleteManagementCompanyRequest(input.id, input.updatedAt),
    onSuccess: (_response, variables) => {
      void queryClient.invalidateQueries({ queryKey: [...MANAGEMENT_COMPANIES_LIST_QUERY_KEY] })
      queryClient.removeQueries({
        queryKey: [...MANAGEMENT_COMPANY_DETAIL_QUERY_KEY, variables.id],
      })
    },
  })
}
