import { RESTRICTED_MODULE_MIN_RANK } from "@builders/domain"
import { createPaymentUseCase, listPaymentsUseCase } from "@builders/application"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"
import { validateCreatePaymentInput, validateListPaymentsQuery } from "./_validators"

export const GET = createQueryRoute({
  route: "/api/payments",
  minRank: RESTRICTED_MODULE_MIN_RANK,
  parseInput: (searchParams) => validateListPaymentsQuery(searchParams),
  useCase: ({ input }) => listPaymentsUseCase(input),
})

export const POST = createMutationRoute({
  scope: "payments.create",
  route: "/api/payments",
  rateLimit: CRUD_CREATE,
  minRank: RESTRICTED_MODULE_MIN_RANK,
  parseInput: validateCreatePaymentInput,
  useCase: ({ input, access }) => createPaymentUseCase(input, access.user.email),
  telemetry: {
    action: "payments.create",
    message: "Payment created",
    entityType: "flooringPayment",
  },
  status: 201,
  buildResponseBody: ({ result }) => ({ payment: result }),
})
