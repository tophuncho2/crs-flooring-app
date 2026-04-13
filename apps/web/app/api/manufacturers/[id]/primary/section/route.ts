import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { updateManufacturerUseCase } from "@builders/application"
import { getManufacturerById } from "@builders/db"
import { validateManufacturerInput } from "../../../_validators"
import { MANUFACTURERS_TOOL_SLUG } from "@/modules/shared/access/lookup-domains"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: MANUFACTURERS_TOOL_SLUG,
    rateLimit: {
      scope: "manufacturers.primary.section.replace",
      limit: 40,
      windowMs: 10 * 60 * 1000,
      route: "/api/manufacturers/[id]/primary/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateManufacturerInput, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = await getManufacturerById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { manufacturer: currentSnapshot },
      message: "Manufacturer changed before section save completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "manufacturers.primary.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }

    const result = await withMutationTelemetry(
      access,
      {
        message: "Manufacturer primary section replaced",
        action: "manufacturers.primary.section.replace",
        route: "/api/manufacturers/[id]/primary/section",
        entityType: "flooringManufacturer",
        entityId: id,
      },
      () => updateManufacturerUseCase(id, input),
    )

    const responseBody = {
      manufacturer: result,
    }
    await finalizeMutationReceipt({
      scope: "manufacturers.primary.section.replace",
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
