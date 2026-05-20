"use client"

import type { Dispatch, SetStateAction } from "react"
import { useMutation, type QueryClient } from "@tanstack/react-query"
import type { CreatePropertyHubForm } from "@builders/domain"
import { MANAGEMENT_COMPANIES_LIST_QUERY_KEY } from "@/modules/management-companies/data/list-management-companies-request"
import { MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY } from "@/modules/management-companies/data/management-company-options-request"
import { PROPERTIES_LIST_QUERY_KEY } from "@/modules/properties/data/list-properties-request"
import { createPropertyHubRequest } from "@/modules/properties/data/mutations"

type Deps = {
  queryClient: QueryClient
  setIsOpen: Dispatch<SetStateAction<boolean>>
  resetAll: () => void
  setError: Dispatch<SetStateAction<string | null>>
}

export function useCreatePropertyHubMutation({
  queryClient,
  setIsOpen,
  resetAll,
  setError,
}: Deps) {
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
      setIsOpen(false)
      resetAll()
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })
}
