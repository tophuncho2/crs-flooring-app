"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { CreateImportInput, UpdateImportInput } from "@builders/application"
import {
  createImportRequest,
  deleteImportRequest,
  updateImportRequest,
} from "@/modules/imports/data/mutations"
import { IMPORTS_LIST_QUERY_KEY } from "@/modules/imports/data/list-imports-request"

type UpdateImportArgs = { id: string; input: UpdateImportInput; revisionKey: string }
type DeleteImportArgs = { id: string; updatedAt: string }

export function useImportsListMutations() {
  const queryClient = useQueryClient()
  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: [...IMPORTS_LIST_QUERY_KEY] })

  const createImport = useMutation({
    mutationFn: (input: CreateImportInput) => createImportRequest(input),
    onSuccess: invalidateList,
  })

  const updateImport = useMutation({
    mutationFn: ({ id, input, revisionKey }: UpdateImportArgs) =>
      updateImportRequest(id, input, revisionKey),
    onSuccess: invalidateList,
  })

  const deleteImport = useMutation({
    mutationFn: ({ id, updatedAt }: DeleteImportArgs) => deleteImportRequest(id, updatedAt),
    onSuccess: invalidateList,
  })

  return {
    createImport,
    updateImport,
    deleteImport,
  }
}
