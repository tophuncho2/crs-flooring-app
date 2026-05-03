"use client"

import { useSingleSectionRecordController } from "@/controllers/record/use-single-section-record-controller"
import { createRecordSectionError } from "@/types/record/section-error"
import type { RecordDetailClientScaffoldContext } from "@/scaffolds/record-detail-client-scaffold"
import {
  deleteManagementCompanyRequest,
  updateManagementCompanyRequest,
} from "@/modules/management-companies/data/mutations"
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
      await deleteManagementCompanyRequest(record.id, record.updatedAt)
    },
    deleteErrorMessage: "Failed to delete management company",
  })
}
