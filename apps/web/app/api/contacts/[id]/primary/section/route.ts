import { updateContactUseCase } from "@builders/application"
import { getContactById } from "@builders/db"
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
import { validateUpdateContactInput } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_UPDATE_SECTION,
      scope: "contacts.primary.section.replace",
      route: "/api/contacts/[id]/primary/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateContactInput, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getContactById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { contact: currentSnapshot },
      message:
        "Contact changed before section save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "contacts.primary.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Contact primary section replaced",
        action: "contacts.primary.section.replace",
        route: "/api/contacts/[id]/primary/section",
        entityType: "flooringContact",
        entityId: id,
      },
      () => updateContactUseCase(id, input),
    )

    const responseBody = { contact: result }
    await finalizeMutationReceipt({
      scope: "contacts.primary.section.replace",
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
