"use client"

import { requestJson } from "@/features/flooring/shared/transport/http"
import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import {
  toManagementCompanyForm,
  validateManagementCompanyForm,
  type ManagementCompanyDetail,
  type ManagementCompanyForm,
} from "../../../domain/types"

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
    detailUrl: `/api/flooring/management-companies/${company.id}`,
    payloadKey: "managementCompany",
    createLocalValue: toManagementCompanyForm,
    saveSection: async ({ localValue, record }) => {
      page.notices.clearNotices()
      const validationError = validateManagementCompanyForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const payload = await requestJson<{ managementCompany: ManagementCompanyDetail }>(
        `/api/flooring/management-companies/${record.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(localValue),
        },
      )

      page.notices.showSuccess("Management company saved")
      return payload.managementCompany
    },
    deleteRecord: async (record) => {
      page.notices.clearNotices()
      await requestJson<{ ok: true }>(`/api/flooring/management-companies/${record.id}`, {
        method: "DELETE",
      })
    },
    deleteErrorMessage: "Failed to delete management company",
  })
}
