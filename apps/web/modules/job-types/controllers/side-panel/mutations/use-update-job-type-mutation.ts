"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { JobTypeForm } from "@builders/domain"
import { updateJobTypeRequest } from "@/modules/job-types/data/mutations"
import { JOB_TYPES_LIST_QUERY_KEY } from "@/modules/job-types/data/list-job-types-request"
import { JOB_TYPE_OPTIONS_QUERY_KEY } from "@/modules/job-types/data/job-type-options-request"

export type UpdateJobTypeMutationInput = {
  id: string
  form: JobTypeForm
  revisionKey: string
}

export function useUpdateJobTypeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateJobTypeMutationInput) =>
      updateJobTypeRequest(input.id, input.form, input.revisionKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...JOB_TYPES_LIST_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: [...JOB_TYPE_OPTIONS_QUERY_KEY] })
    },
  })
}
