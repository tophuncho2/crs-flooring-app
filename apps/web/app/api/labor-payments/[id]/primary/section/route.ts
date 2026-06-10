import { updateLaborPaymentUseCase } from "@builders/application"
import { getLaborPaymentById } from "@builders/db"
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
import { validateUpdateLaborPaymentInput } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_UPDATE_SECTION,
      scope: "laborPayments.primary.section.replace",
      route: "/api/labor-payments/[id]/primary/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateLaborPaymentInput, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getLaborPaymentById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { laborPayment: currentSnapshot },
      message:
        "Labor payment changed before section save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "laborPayments.primary.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Labor payment primary section replaced",
        action: "laborPayments.primary.section.replace",
        route: "/api/labor-payments/[id]/primary/section",
        entityType: "flooringLaborPayment",
        entityId: id,
      },
      () => updateLaborPaymentUseCase(id, input),
    )

    const responseBody = { laborPayment: result }
    await finalizeMutationReceipt({
      scope: "laborPayments.primary.section.replace",
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
