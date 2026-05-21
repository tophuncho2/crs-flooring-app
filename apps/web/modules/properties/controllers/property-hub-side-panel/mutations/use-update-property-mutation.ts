"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type PropertyPrimaryForm } from "@builders/domain"
import { updatePropertyRequest } from "@/modules/properties/data/mutations"
import { PROPERTIES_LIST_QUERY_KEY } from "@/modules/properties/data/list-properties-request"
import { PROPERTY_DETAIL_QUERY_KEY } from "@/modules/properties/data/property-detail-request"

export type UpdatePropertyMutationInput = {
  id: string
  form: PropertyPrimaryForm
  revisionKey: string
}

export function useUpdatePropertyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdatePropertyMutationInput) =>
      updatePropertyRequest(input.id, input.form, input.revisionKey),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: [...PROPERTIES_LIST_QUERY_KEY] })
      void queryClient.invalidateQueries({
        queryKey: [...PROPERTY_DETAIL_QUERY_KEY, response.property.id],
      })
    },
  })
}
