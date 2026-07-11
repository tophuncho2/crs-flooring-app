import { deletePaymentPurposeUseCase, PaymentPurposeExecutionError } from "@builders/application"
import { getPaymentPurposeById, getPaymentPurposeDetailById } from "@builders/db"
import { ELEVATED_MODULE_MIN_RANK, PAYMENT_PURPOSE_NOT_FOUND_MESSAGE } from "@builders/domain"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"

export const GET = createQueryRoute({
  route: "/api/payment-purposes/[id]",
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: () => ({}),
  useCase: async ({ params }) => {
    const paymentPurpose = await getPaymentPurposeDetailById(params.id, { withNeighbors: true })
    if (!paymentPurpose) {
      throw new PaymentPurposeExecutionError({
        code: "PAYMENT_PURPOSE_NOT_FOUND",
        message: PAYMENT_PURPOSE_NOT_FOUND_MESSAGE,
        status: 404,
      })
    }
    return paymentPurpose
  },
  buildResponseBody: ({ result }) => ({ paymentPurpose: result }),
})

export const DELETE = createMutationRoute({
  scope: "paymentPurposes.delete",
  route: "/api/payment-purposes/[id]",
  rateLimit: CRUD_DELETE,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: (value) => value,
  concurrency: {
    loadSnapshot: ({ params }) => getPaymentPurposeById(params.id),
    snapshotKey: "paymentPurpose",
    message: "Payment purpose changed before delete completed. Refresh and try again.",
  },
  useCase: ({ params }) => deletePaymentPurposeUseCase(params.id),
  telemetry: ({ params }) => ({
    action: "paymentPurposes.delete",
    message: "Payment purpose deleted",
    entityType: "flooringPaymentPurpose",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: () => ({ ok: true as const }),
})
