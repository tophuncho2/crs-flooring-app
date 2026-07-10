import {
  createPrismaPageLoadIssue,
  getPaymentPurposeDetailById,
  type PrismaDetailPageResult,
} from "@builders/db"
import type { PaymentPurpose } from "@builders/domain"

export type PaymentPurposeDetailPageData = {
  paymentPurpose: PaymentPurpose
  previousPaymentPurposeId: string | null
  nextPaymentPurposeId: string | null
}

export async function getPaymentPurposeDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<PaymentPurposeDetailPageData>> {
  try {
    const detail = await getPaymentPurposeDetailById(id, { withNeighbors: true })
    if (!detail) {
      return { ok: false, notFound: true }
    }
    const { previousPaymentPurpose, nextPaymentPurpose, ...paymentPurpose } = detail
    return {
      ok: true,
      data: {
        paymentPurpose,
        previousPaymentPurposeId: previousPaymentPurpose?.id ?? null,
        nextPaymentPurposeId: nextPaymentPurpose?.id ?? null,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "PAYMENT_PURPOSE_DETAIL_LOAD_FAILED",
        title: "Payment Purpose Unavailable",
        message: "The app could not load this payment purpose.",
        detail: "The payment purpose record could not be loaded.",
      }),
    }
  }
}
