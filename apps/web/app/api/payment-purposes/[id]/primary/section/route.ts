import { updatePaymentPurposeUseCase } from "@builders/application"
import { getPaymentPurposeById } from "@builders/db"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { enforceRankAtLeast } from "@/server/auth/route-auth"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateUpdatePaymentPurposeInput } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_UPDATE_SECTION,
      scope: "paymentPurposes.primary.section.replace",
      route: "/api/payment-purposes/[id]/primary/section",
    },
  })
  if (access instanceof Response) return access

  const forbidden = enforceRankAtLeast(access, ELEVATED_MODULE_MIN_RANK)
  if (forbidden) return forbidden

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdatePaymentPurposeInput, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getPaymentPurposeById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { paymentPurpose: currentSnapshot },
      message:
        "Payment purpose changed before section save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "paymentPurposes.primary.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Payment purpose primary section replaced",
        action: "paymentPurposes.primary.section.replace",
        route: "/api/payment-purposes/[id]/primary/section",
        entityType: "flooringPaymentPurpose",
        entityId: id,
      },
      () => updatePaymentPurposeUseCase(id, input, access.user.email),
    )

    const responseBody = { paymentPurpose: result }
    await finalizeMutationReceipt({
      scope: "paymentPurposes.primary.section.replace",
      access,
      mutation,
      responseStatus: 200,
      responseBody,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}
