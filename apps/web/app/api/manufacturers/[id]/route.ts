import { deleteManufacturerUseCase } from "@builders/application"
import { getManufacturerById } from "@builders/db"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
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

export async function DELETE(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_DELETE,
      scope: "manufacturers.delete",
      route: "/api/manufacturers/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await context.params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = await getManufacturerById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { manufacturer: currentSnapshot },
      message: "Manufacturer changed before delete completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "manufacturers.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }
    await withMutationTelemetry(
      access,
      {
        message: "Manufacturer deleted",
        action: "manufacturers.delete",
        route: "/api/manufacturers/[id]",
        entityType: "flooringManufacturer",
        entityId: id,
      },
      () => deleteManufacturerUseCase(id),
    )
    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "manufacturers.delete",
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
