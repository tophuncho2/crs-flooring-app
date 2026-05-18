"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useSingleSectionRecordController } from "@/controllers/record/use-single-section-record-controller"
import { createRecordSectionError } from "@/types/record/section-error"
import type { RecordDetailClientScaffoldContext } from "@/scaffolds/record-detail-client-scaffold"
import {
  deleteManagementCompanyRequest,
  updateManagementCompanyRequest,
} from "@/modules/management-companies/data/mutations"
import { MANAGEMENT_COMPANIES_LIST_QUERY_KEY } from "@/modules/management-companies/data/list-management-companies-request"
import {
  toManagementCompanyForm,
  validateManagementCompanyForm,
  type ManagementCompanyDetail,
  type ManagementCompanyForm,
} from "@builders/domain"

export function useManagementCompanyPrimarySection({
  page,
  company,
}: {
  page: RecordDetailClientScaffoldContext
  company: ManagementCompanyDetail
}) {
  const queryClient = useQueryClient()

  // The footer's "Deleting…" state must persist until the list query has
  // actually been refetched — otherwise the user lands on the list page
  // and briefly sees the row they just deleted. mutateAsync awaits the
  // promise returned by onSuccess, so returning invalidateQueries here
  // chains list invalidation into the delete await.
  const deleteCompany = useMutation({
    mutationFn: ({ id, updatedAt }: { id: string; updatedAt: string }) =>
      deleteManagementCompanyRequest(id, updatedAt),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [...MANAGEMENT_COMPANIES_LIST_QUERY_KEY] }),
  })

  return useSingleSectionRecordController<ManagementCompanyDetail, ManagementCompanyForm>({
    page,
    scope: "management-company",
    id: company.id,
    initialRecord: company,
    detailUrl: `/api/management-companies/${company.id}`,
    payloadKey: "managementCompany",
    createLocalValue: toManagementCompanyForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record, revisionKey }) => {
      const validationError = validateManagementCompanyForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const payload = await updateManagementCompanyRequest(record.id, localValue, revisionKey)

      return {
        serverValue: payload.managementCompany,
        noticeMessage: "Management company saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteCompany.mutateAsync({ id: record.id, updatedAt: record.updatedAt })
    },
    deleteErrorMessage: "Failed to delete management company",
  })
}
