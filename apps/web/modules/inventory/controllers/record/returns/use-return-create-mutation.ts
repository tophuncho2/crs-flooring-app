"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { CreateReturnInput } from "@builders/application"
import { createReturnRequest } from "@/modules/inventory/data/mutations"
import { INVENTORY_LIST_QUERY_KEY } from "@/modules/inventory/data/list-inventory-request"

type CreateReturnArgs = { input: CreateReturnInput }

/**
 * The create-return mutation, usable from any launch surface (list, inventory
 * record view, WO material-items). Invalidates the inventory list so a new
 * returned row shows up; the launching host reconciles its own adjustments view
 * off the mutation response in `onCreated`.
 */
export function useReturnCreateMutation() {
  const queryClient = useQueryClient()

  const createReturn = useMutation({
    mutationFn: ({ input }: CreateReturnArgs) => createReturnRequest(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [...INVENTORY_LIST_QUERY_KEY] }),
  })

  return { createReturn }
}
