"use client"

import type { Dispatch, SetStateAction } from "react"
import { useMutation, type QueryClient } from "@tanstack/react-query"
import { toPropertyPrimaryForm, type PropertyPrimaryForm } from "@builders/domain"
import { createPropertyRequest } from "@/modules/properties/data/mutations"
import { PROPERTIES_LIST_QUERY_KEY } from "@/modules/properties/data/list-properties-request"

type Deps = {
  queryClient: QueryClient
  setRecordId: Dispatch<SetStateAction<string | null>>
  setUpdatedAt: Dispatch<SetStateAction<string | null>>
  setManagementCompanyLabel: Dispatch<SetStateAction<string | null>>
  setForm: Dispatch<SetStateAction<PropertyPrimaryForm>>
  setBaseline: Dispatch<SetStateAction<PropertyPrimaryForm>>
  setError: Dispatch<SetStateAction<string | null>>
}

export function useCreatePropertyMutation({
  queryClient,
  setRecordId,
  setUpdatedAt,
  setManagementCompanyLabel,
  setForm,
  setBaseline,
  setError,
}: Deps) {
  return useMutation({
    mutationFn: (input: PropertyPrimaryForm) => createPropertyRequest(input),
    onSuccess: (response) => {
      const detail = response.property
      const next = toPropertyPrimaryForm(detail)
      setRecordId(detail.id)
      setUpdatedAt(detail.updatedAt)
      setManagementCompanyLabel(detail.managementCompany?.name ?? null)
      setForm(next)
      setBaseline(next)
      setError(null)
      void queryClient.invalidateQueries({ queryKey: [...PROPERTIES_LIST_QUERY_KEY] })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })
}
