"use client"

import {
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  toManagementCompanyForm,
  validateManagementCompanyForm,
  type ManagementCompanyDetail,
  type ManagementCompanyForm,
} from "@builders/domain"
import {
  deleteManagementCompanyRequest,
  updateManagementCompanyRequest,
} from "@/modules/management-companies/data/mutations"

export function useMcPrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: ManagementCompanyDetail
}) {
  return useSingleSectionRecordController<ManagementCompanyDetail, ManagementCompanyForm>({
    page,
    scope: "management-companies",
    id: entry.id,
    initialRecord: entry,
    detailUrl: `/api/management-companies/${entry.id}`,
    payloadKey: "managementCompany",
    createLocalValue: toManagementCompanyForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const validationError = validateManagementCompanyForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }
      const { managementCompany } = await updateManagementCompanyRequest(
        record.id,
        localValue,
        record.updatedAt,
      )
      return {
        serverValue: managementCompany,
        noticeMessage: "Management company saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteManagementCompanyRequest(record.id, record.updatedAt)
    },
    deleteErrorMessage: "Failed to delete management company",
  })
}
