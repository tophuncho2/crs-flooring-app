"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  toJobTypeForm,
  validateJobTypeForm,
  type JobType,
  type JobTypeForm,
} from "@builders/domain"
import { deleteJobTypeRequest, updateJobTypeRequest } from "@/modules/job-types/data/mutations"
import { JOB_TYPES_LIST_QUERY_KEY } from "@/modules/job-types/data/list-job-types-request"

export function useJobTypePrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: JobType
}) {
  const queryClient = useQueryClient()

  return useSingleSectionRecordController<JobType, JobTypeForm>({
    page,
    scope: "job-types",
    id: entry.id,
    initialRecord: entry,
    detailUrl: `/api/job-types/${entry.id}`,
    payloadKey: "jobType",
    createLocalValue: toJobTypeForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const validationError = validateJobTypeForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }
      const { jobType } = await updateJobTypeRequest(record.id, localValue, record.updatedAt)
      return {
        serverValue: jobType,
        noticeMessage: "Job type saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteJobTypeRequest(record.id, record.updatedAt)
      await queryClient.invalidateQueries({ queryKey: JOB_TYPES_LIST_QUERY_KEY })
    },
    deleteErrorMessage: "Failed to delete job type",
  })
}
