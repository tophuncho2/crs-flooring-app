"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
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
    detailUrl: `/api/management-companies/${company.id}`,
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

      const payload = await requestJson<{ managementCompany: ManagementCompanyDetail }>(
        `/api/management-companies/${record.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(localValue),
        },
      )

      return {
        serverValue: payload.managementCompany,
        noticeMessage: "Management company saved",
      }
    },
    deleteRecord: async (record) => {
      await requestJson<{ ok: true }>(`/api/management-companies/${record.id}`, {
        method: "DELETE",
      })
    },
    deleteErrorMessage: "Failed to delete management company",
  })
}
