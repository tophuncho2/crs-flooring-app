import { normalizeFlooringNavPreferenceInput, saveUserFlooringNavPreference } from "@/server/account/flooring-nav"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  parseMutationEnvelope,
  enforceMutationReceipt,
  finalizeMutationReceipt,
} from "@/server/http/route-policy"

export async function PATCH(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    rateLimit: {
      scope: "account.flooringNav.update",
      limit: 60,
      windowMs: 10 * 60 * 1000,
      route: "/api/account/flooring-nav",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, normalizeFlooringNavPreferenceInput)

    const receipt = await enforceMutationReceipt({
      scope: "account.flooringNav.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const preferences = await withMutationTelemetry(
      access,
      {
        message: "Flooring navigation preferences updated",
        action: "account.flooringNav.update",
        route: "/api/account/flooring-nav",
        entityType: "user",
        entityId: access.user.id,
      },
      () => saveUserFlooringNavPreference(access.user.id, input),
    )

    const responseBody = preferences
    await finalizeMutationReceipt({
      scope: "account.flooringNav.update",
      access,
      mutation,
      responseStatus: 200,
      responseBody: responseBody as Record<string, unknown>,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}
