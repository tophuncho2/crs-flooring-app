"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  CreateWorkOrderUseCaseInput,
  UpdateWorkOrderUseCaseInput,
} from "@builders/application"
import {
  createWorkOrderRequest,
  deleteWorkOrderRequest,
  updateWorkOrderRequest,
} from "@/modules/work-orders/data/mutations"
import { WORK_ORDERS_LIST_QUERY_KEY } from "@/modules/work-orders/data/list-work-orders-request"

type UpdateArgs = { id: string; input: UpdateWorkOrderUseCaseInput; revisionKey: string }
type DeleteArgs = { id: string; updatedAt: string }

export function useWorkOrdersListMutations() {
  const queryClient = useQueryClient()
  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: [...WORK_ORDERS_LIST_QUERY_KEY] })

  const createWorkOrder = useMutation({
    mutationFn: (input: CreateWorkOrderUseCaseInput) => createWorkOrderRequest(input),
    onSuccess: invalidateList,
  })

  const updateWorkOrder = useMutation({
    mutationFn: ({ id, input, revisionKey }: UpdateArgs) =>
      updateWorkOrderRequest(id, input, revisionKey),
    onSuccess: invalidateList,
  })

  const deleteWorkOrder = useMutation({
    mutationFn: ({ id, updatedAt }: DeleteArgs) => deleteWorkOrderRequest(id, updatedAt),
    onSuccess: invalidateList,
  })

  return {
    createWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
  }
}
