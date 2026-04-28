"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { CreateImportInput, UpdateImportInput } from "@builders/application"
import type { StagedInventoryRowsDiff } from "@builders/domain"
import {
  createImportRequest,
  deleteImportRequest,
  markStagedRowsForImportRequest,
  updateImportRequest,
  updateImportStagedInventoryRowsRequest,
} from "@/modules/imports/data/mutations"
import { IMPORTS_LIST_QUERY_KEY } from "@/modules/imports/data/list-imports-request"

type UpdateImportArgs = { id: string; input: UpdateImportInput; revisionKey: string }
type DeleteImportArgs = { id: string; updatedAt: string }
type UpdateStagedRowsArgs = { importId: string; diff: StagedInventoryRowsDiff; revisionKey: string }
type MarkStagedRowsArgs = { importId: string; stagedRowIds: string[] }

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

  const updateStagedInventoryRows = useMutation({
    mutationFn: ({ importId, diff, revisionKey }: UpdateStagedRowsArgs) =>
      updateImportStagedInventoryRowsRequest(importId, diff, revisionKey),
    onSuccess: invalidateList,
  })

  const markStagedRowsForImport = useMutation({
    mutationFn: ({ importId, stagedRowIds }: MarkStagedRowsArgs) =>
      markStagedRowsForImportRequest(importId, stagedRowIds),
    onSuccess: invalidateList,
  })

  return {
    createImport,
    updateImport,
    deleteImport,
    updateStagedInventoryRows,
    markStagedRowsForImport,
  }
}
