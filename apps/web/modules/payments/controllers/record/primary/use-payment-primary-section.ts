"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  describePaymentFormIssues,
  toPaymentForm,
  validatePaymentForm,
  type Payment,
  type PaymentForm,
} from "@builders/domain"
import { deletePaymentRequest, updatePaymentRequest } from "@/modules/payments/data/mutations"
import { PAYMENTS_LIST_QUERY_KEY } from "@/modules/payments/data/list-payments-request"

/**
 * Edit-face controller for a standalone payment. Wires the engine's single-section
 * record controller to the payments mutations: optimistic-concurrency on save +
 * delete (`expectedUpdatedAt`), and the engine reconciles the 409 conflict
 * snapshot (`{ payment }`) the API already returns. The DateCell wants
 * `YYYY-MM-DD`, so the local form slices the row's ISO `paymentDate`.
 */
export function usePaymentPrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: Payment
}) {
  const queryClient = useQueryClient()

  return useSingleSectionRecordController<Payment, PaymentForm>({
    page,
    scope: "payments",
    id: entry.id,
    initialRecord: entry,
    detailUrl: `/api/payments/${entry.id}`,
    payloadKey: "payment",
    createLocalValue: (record) => ({
      ...toPaymentForm(record),
      paymentDate: record.paymentDate ? record.paymentDate.slice(0, 10) : "",
    }),
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const issues = validatePaymentForm(localValue)
      if (issues.length > 0) {
        throw createRecordSectionError({
          kind: "validation",
          message: describePaymentFormIssues(issues),
          retryable: true,
        })
      }
      const { payment } = await updatePaymentRequest(record.id, localValue, record.updatedAt)
      return {
        serverValue: payment,
        noticeMessage: "Payment saved",
      }
    },
    deleteRecord: async (record) => {
      await deletePaymentRequest(record.id, record.updatedAt)
      await queryClient.invalidateQueries({ queryKey: [...PAYMENTS_LIST_QUERY_KEY] })
    },
    deleteErrorMessage: "Failed to delete payment",
  })
}
