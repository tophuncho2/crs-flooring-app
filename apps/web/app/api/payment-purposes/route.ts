import {
  createPaymentPurposeUseCase,
  listPaymentPurposesUseCase,
} from "@builders/application"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"
import {
  validateCreatePaymentPurposeInput,
  validateListPaymentPurposesQuery,
} from "./_validators"

export const GET = createQueryRoute({
  route: "/api/payment-purposes",
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseInput: (searchParams) => validateListPaymentPurposesQuery(searchParams),
  useCase: ({ input }) => listPaymentPurposesUseCase(input),
})

export const POST = createMutationRoute({
  scope: "paymentPurposes.create",
  route: "/api/payment-purposes",
  rateLimit: CRUD_CREATE,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseInput: validateCreatePaymentPurposeInput,
  useCase: ({ input, access }) => createPaymentPurposeUseCase(input, access.user.email),
  telemetry: {
    action: "paymentPurposes.create",
    message: "Payment purpose created",
    entityType: "flooringPaymentPurpose",
  },
  status: 201,
  buildResponseBody: ({ result }) => ({ paymentPurpose: result }),
})
