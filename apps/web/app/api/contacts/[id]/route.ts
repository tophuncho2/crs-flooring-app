import { CONTACTS_TOOL_SLUG } from "@/modules/shared/access/lookup-domains"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { parseUuidParam } from "@/server/http/api-helpers"
import { deleteContactUseCase } from "@builders/application"
import { getContactById } from "@builders/db"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
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

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: CONTACTS_TOOL_SLUG,
    rateLimit: {
      scope: "contacts.delete",
      limit: 40,
      windowMs: 10 * 60 * 1000,
      route: "/api/contacts/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getContactById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { contact: currentSnapshot },
      message: "Contact changed before delete completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "contacts.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    await withMutationTelemetry(
      access,
      {
        message: "Contact deleted",
        action: "contacts.delete",
        route: "/api/contacts/[id]",
        entityType: "flooringContact",
        entityId: id,
      },
      () => deleteContactUseCase(id),
    )

    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "contacts.delete",
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
