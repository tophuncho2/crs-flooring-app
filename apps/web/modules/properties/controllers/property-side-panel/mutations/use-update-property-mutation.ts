"use client"

import type { Dispatch, SetStateAction } from "react"
import { useMutation, type QueryClient } from "@tanstack/react-query"
import { toPropertyPrimaryForm, type PropertyPrimaryForm } from "@builders/domain"
import { updatePropertyRequest } from "@/modules/properties/data/mutations"
import { PROPERTIES_LIST_QUERY_KEY } from "@/modules/properties/data/list-properties-request"
import { PROPERTY_DETAIL_QUERY_KEY } from "@/modules/properties/data/property-detail-request"

type Deps = {
  queryClient: QueryClient
  setUpdatedAt: Dispatch<SetStateAction<string | null>>
  setManagementCompanyLabel: Dispatch<SetStateAction<string | null>>
  setForm: Dispatch<SetStateAction<PropertyPrimaryForm>>
  setBaseline: Dispatch<SetStateAction<PropertyPrimaryForm>>
  setError: Dispatch<SetStateAction<string | null>>
}

export function useUpdatePropertyMutation({
  queryClient,
  setUpdatedAt,
  setManagementCompanyLabel,
  setForm,
  setBaseline,
  setError,
}: Deps) {
  return useMutation({
    mutationFn: (input: { id: string; form: PropertyPrimaryForm; revisionKey: string }) =>
      updatePropertyRequest(input.id, input.form, input.revisionKey),
    onSuccess: (response) => {
      const detail = response.property
      const next = toPropertyPrimaryForm(detail)
      setUpdatedAt(detail.updatedAt)
      setManagementCompanyLabel(detail.managementCompany?.name ?? null)
      setForm(next)
      setBaseline(next)
      setError(null)
      void queryClient.invalidateQueries({ queryKey: [...PROPERTIES_LIST_QUERY_KEY] })
      void queryClient.invalidateQueries({
        queryKey: [...PROPERTY_DETAIL_QUERY_KEY, detail.id],
      })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })
}
