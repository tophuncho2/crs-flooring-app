"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deletePropertyRequest } from "@/modules/properties/data/mutations"
import { PROPERTIES_LIST_QUERY_KEY } from "@/modules/properties/data/list-properties-request"
import { PROPERTY_DETAIL_QUERY_KEY } from "@/modules/properties/data/property-detail-request"

export type DeletePropertyMutationInput = { id: string; updatedAt: string }

export function useDeletePropertyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: DeletePropertyMutationInput) =>
      deletePropertyRequest(input.id, input.updatedAt),
    onSuccess: (_response, variables) => {
      void queryClient.invalidateQueries({ queryKey: [...PROPERTIES_LIST_QUERY_KEY] })
      queryClient.removeQueries({
        queryKey: [...PROPERTY_DETAIL_QUERY_KEY, variables.id],
      })
    },
  })
}
