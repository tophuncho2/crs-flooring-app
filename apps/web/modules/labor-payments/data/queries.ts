import {
  createPrismaPageLoadIssue,
  getLaborPaymentById,
  isPrismaNotFoundError,
  type PrismaDetailPageResult,
} from "@builders/db"
import type { LaborPayment } from "@builders/domain"

export type LaborPaymentDetailPageData = {
  laborPayment: LaborPayment
}

export async function getLaborPaymentDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<LaborPaymentDetailPageData>> {
  try {
    const laborPayment = await getLaborPaymentById(id)
    return { ok: true, data: { laborPayment } }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }
    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "LABOR_PAYMENT_DETAIL_LOAD_FAILED",
        title: "Labor Payment Unavailable",
        message: "The app could not load this labor payment.",
        detail: "The labor payment record could not be loaded.",
      }),
    }
  }
}
