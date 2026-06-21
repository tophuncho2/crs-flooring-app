"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  CreateInventoryInput,
  UpdateInventoryInput,
} from "@builders/application"
import {
  createInventoryRequest,
  deleteInventoryRequest,
  updateInventoryRequest,
} from "@/modules/inventory/data/mutations"
import { INVENTORY_LIST_QUERY_KEY } from "@/modules/inventory/data/list-inventory-request"

type UpdateArgs = { id: string; input: UpdateInventoryInput; revisionKey: string }
type DeleteArgs = { id: string; updatedAt: string }
type CreateArgs = { input: CreateInventoryInput }

export function useInventoryListMutations() {
  const queryClient = useQueryClient()
  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: [...INVENTORY_LIST_QUERY_KEY] })

  const updateInventory = useMutation({
    mutationFn: ({ id, input, revisionKey }: UpdateArgs) =>
      updateInventoryRequest(id, input, revisionKey),
    onSuccess: invalidateList,
  })

  const deleteInventory = useMutation({
    mutationFn: ({ id, updatedAt }: DeleteArgs) => deleteInventoryRequest(id, updatedAt),
    onSuccess: invalidateList,
  })

  const createInventory = useMutation({
    mutationFn: ({ input }: CreateArgs) => createInventoryRequest(input),
    onSuccess: invalidateList,
  })

  return { updateInventory, deleteInventory, createInventory }
}
