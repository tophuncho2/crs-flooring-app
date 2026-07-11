import { updatePaymentPurposeUseCase } from "@builders/application"
import { getPaymentPurposeById } from "@builders/db"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateUpdatePaymentPurposeInput } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "paymentPurposes.primary.section.replace",
  route: "/api/payment-purposes/[id]/primary/section",
  rateLimit: CRUD_UPDATE_SECTION,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateUpdatePaymentPurposeInput,
  concurrency: {
    loadSnapshot: ({ params }) => getPaymentPurposeById(params.id),
    snapshotKey: "paymentPurpose",
    message: "Payment purpose changed before section save completed. Refresh and try again.",
  },
  useCase: ({ input, access, params }) => updatePaymentPurposeUseCase(params.id, input, access.user.email),
  telemetry: ({ params }) => ({
    action: "paymentPurposes.primary.section.replace",
    message: "Payment purpose primary section replaced",
    entityType: "flooringPaymentPurpose",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: ({ result }) => ({ paymentPurpose: result }),
})
