import { RESTRICTED_MODULE_MIN_RANK } from "@builders/domain"
import {
  deletePaymentUseCase,
  getPaymentUseCase,
  updatePaymentUseCase,
} from "@builders/application"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_DELETE, CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"
import { validateUpdatePaymentInput } from "../_validators"

export const GET = createQueryRoute({
  route: "/api/payments/[id]",
  minRank: RESTRICTED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: () => ({}),
  useCase: async ({ params }) => getPaymentUseCase(params.id),
  buildResponseBody: ({ result }) => ({ payment: result }),
})

export const PATCH = createMutationRoute({
  scope: "payments.update",
  route: "/api/payments/[id]",
  rateLimit: CRUD_UPDATE_SECTION,
  minRank: RESTRICTED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateUpdatePaymentInput,
  concurrency: {
    loadSnapshot: ({ params }) => getPaymentUseCase(params.id),
    snapshotKey: "payment",
    message: "Payment changed before your edit completed. Refresh and try again.",
  },
  useCase: ({ input, access, params }) => updatePaymentUseCase(params.id, input, access.user.email),
  telemetry: ({ params }) => ({
    action: "payments.update",
    message: "Payment updated",
    entityType: "flooringPayment",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: ({ result }) => ({ payment: result }),
})

export const DELETE = createMutationRoute({
  scope: "payments.delete",
  route: "/api/payments/[id]",
  rateLimit: CRUD_DELETE,
  minRank: RESTRICTED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: (value) => value,
  concurrency: {
    loadSnapshot: ({ params }) => getPaymentUseCase(params.id),
    snapshotKey: "payment",
    message: "Payment changed before delete completed. Refresh and try again.",
  },
  useCase: ({ params }) => deletePaymentUseCase(params.id),
  telemetry: ({ params }) => ({
    action: "payments.delete",
    message: "Payment deleted",
    entityType: "flooringPayment",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: () => ({ ok: true as const }),
})
