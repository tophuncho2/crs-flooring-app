"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  toLaborPaymentForm,
  validateLaborPaymentForm,
  type LaborPayment,
  type LaborPaymentForm,
} from "@builders/domain"
import {
  deleteLaborPaymentRequest,
  updateLaborPaymentRequest,
} from "@/modules/labor-payments/data/mutations"
import { LABOR_PAYMENTS_LIST_QUERY_KEY } from "@/modules/labor-payments/data/list-labor-payments-request"

export function useLaborPaymentPrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: LaborPayment
}) {
  const queryClient = useQueryClient()

  return useSingleSectionRecordController<LaborPayment, LaborPaymentForm>({
    page,
    scope: "labor-payments",
    id: entry.id,
    initialRecord: entry,
    detailUrl: `/api/labor-payments/${entry.id}`,
    payloadKey: "laborPayment",
    createLocalValue: toLaborPaymentForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const validationError = validateLaborPaymentForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }
      const { laborPayment } = await updateLaborPaymentRequest(record.id, localValue, record.updatedAt)
      return {
        serverValue: laborPayment,
        noticeMessage: "Labor payment saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteLaborPaymentRequest(record.id, record.updatedAt)
      await queryClient.invalidateQueries({ queryKey: LABOR_PAYMENTS_LIST_QUERY_KEY })
    },
    deleteErrorMessage: "Failed to delete labor payment",
  })
}
