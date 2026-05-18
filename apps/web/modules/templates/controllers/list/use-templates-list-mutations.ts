"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteTemplateRequest } from "@/modules/templates/data/mutations"
import { TEMPLATES_LIST_QUERY_KEY } from "@/modules/templates/data/list-templates-request"

type DeleteTemplateArgs = { id: string; updatedAt: string }

export function useTemplatesListMutations() {
  const queryClient = useQueryClient()
  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: [...TEMPLATES_LIST_QUERY_KEY] })

  const deleteTemplate = useMutation({
    mutationFn: ({ id, updatedAt }: DeleteTemplateArgs) =>
      deleteTemplateRequest(id, updatedAt),
    onSuccess: invalidateList,
  })

  return { deleteTemplate }
}
