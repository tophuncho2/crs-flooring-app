"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  toPaymentPurposeForm,
  validatePaymentPurposeForm,
  type PaymentPurpose,
  type PaymentPurposeForm,
} from "@builders/domain"
import {
  deletePaymentPurposeRequest,
  updatePaymentPurposeRequest,
} from "@/modules/payment-purposes/data/mutations"
import { PAYMENT_PURPOSES_LIST_QUERY_KEY } from "@/modules/payment-purposes/data/list-payment-purposes-request"

export function usePaymentPurposePrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: PaymentPurpose
}) {
  const queryClient = useQueryClient()

  return useSingleSectionRecordController<PaymentPurpose, PaymentPurposeForm>({
    page,
    scope: "payment-purposes",
    id: entry.id,
    initialRecord: entry,
    detailUrl: `/api/payment-purposes/${entry.id}`,
    payloadKey: "paymentPurpose",
    createLocalValue: toPaymentPurposeForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const validationError = validatePaymentPurposeForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }
      const { paymentPurpose } = await updatePaymentPurposeRequest(
        record.id,
        localValue,
        record.updatedAt,
      )
      return {
        serverValue: paymentPurpose,
        noticeMessage: "Payment purpose saved",
      }
    },
    deleteRecord: async (record) => {
      await deletePaymentPurposeRequest(record.id, record.updatedAt)
      await queryClient.invalidateQueries({ queryKey: PAYMENT_PURPOSES_LIST_QUERY_KEY })
    },
    deleteErrorMessage: "Failed to delete payment purpose",
  })
}
