"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  toCertificatePrimaryForm,
  validateCertificatePrimaryForm,
  type CertificateDetailRecord,
  type CertificatePrimaryForm,
} from "@builders/domain"
import {
  deleteCertificateRequest,
  updateCertificateRequest,
} from "@/modules/certificates/data/mutations"
import { CERTIFICATES_LIST_QUERY_KEY } from "@/modules/certificates/data/list-certificates-request"

export function useCertificatePrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: CertificateDetailRecord
}) {
  const queryClient = useQueryClient()

  return useSingleSectionRecordController<CertificateDetailRecord, CertificatePrimaryForm>({
    page,
    scope: "certificates",
    id: entry.id,
    initialRecord: entry,
    detailUrl: `/api/certificates/${entry.id}`,
    payloadKey: "certificate",
    createLocalValue: toCertificatePrimaryForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const validationError = validateCertificatePrimaryForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }
      const { certificate } = await updateCertificateRequest(
        record.id,
        localValue,
        record.updatedAt,
      )
      return {
        serverValue: certificate,
        noticeMessage: "Certificate saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteCertificateRequest(record.id, record.updatedAt)
      await queryClient.invalidateQueries({ queryKey: CERTIFICATES_LIST_QUERY_KEY })
    },
    deleteErrorMessage: "Failed to delete certificate",
  })
}
