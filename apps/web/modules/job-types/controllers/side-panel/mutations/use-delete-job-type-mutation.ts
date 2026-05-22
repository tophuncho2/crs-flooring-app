"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteJobTypeRequest } from "@/modules/job-types/data/mutations"
import { JOB_TYPES_LIST_QUERY_KEY } from "@/modules/job-types/data/list-job-types-request"
import { JOB_TYPE_OPTIONS_QUERY_KEY } from "@/modules/job-types/data/job-type-options-request"

export type DeleteJobTypeMutationInput = { id: string; updatedAt: string }

export function useDeleteJobTypeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: DeleteJobTypeMutationInput) =>
      deleteJobTypeRequest(input.id, input.updatedAt),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...JOB_TYPES_LIST_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: [...JOB_TYPE_OPTIONS_QUERY_KEY] })
    },
  })
}
