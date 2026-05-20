"use client"

import type { Dispatch, SetStateAction } from "react"
import { useMutation, type QueryClient } from "@tanstack/react-query"
import { deletePropertyRequest } from "@/modules/properties/data/mutations"
import { PROPERTIES_LIST_QUERY_KEY } from "@/modules/properties/data/list-properties-request"
import { PROPERTY_DETAIL_QUERY_KEY } from "@/modules/properties/data/property-detail-request"
import type { PropertySidePanelOpenSpec } from "../types"

type Deps = {
  queryClient: QueryClient
  setOpen: Dispatch<SetStateAction<PropertySidePanelOpenSpec | null>>
  setError: Dispatch<SetStateAction<string | null>>
}

export function useDeletePropertyMutation({ queryClient, setOpen, setError }: Deps) {
  return useMutation({
    mutationFn: (input: { id: string; updatedAt: string }) =>
      deletePropertyRequest(input.id, input.updatedAt),
    onSuccess: (_response, variables) => {
      setOpen(null)
      void queryClient.invalidateQueries({ queryKey: [...PROPERTIES_LIST_QUERY_KEY] })
      queryClient.removeQueries({
        queryKey: [...PROPERTY_DETAIL_QUERY_KEY, variables.id],
      })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })
}
