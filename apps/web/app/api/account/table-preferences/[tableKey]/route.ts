import {
  getUserTablePreference,
  normalizeTablePreferenceInput,
  saveUserTablePreference,
} from "@builders/application"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceQueryRateLimit,
  parseMutationEnvelope,
  enforceMutationReceipt,
  finalizeMutationReceipt,
} from "@/server/http/route-policy"

export async function GET(request: Request, context: { params: Promise<{ tableKey: string }> }) {
  const access = await applyRoutePolicy(request, { capability: "system.access" })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/account/table-preferences/[tableKey]")
  if (rateLimited) return rateLimited

  const { tableKey } = await context.params

  try {
    return routeJson(access, await getUserTablePreference(access.user.id, tableKey))
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ tableKey: string }> }) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    rateLimit: {
      scope: "account.tablePreferences.update",
      limit: 120,
      windowMs: 10 * 60 * 1000,
      route: "/api/account/table-preferences/[tableKey]",
    },
  })
  if (access instanceof Response) return access

  const { tableKey } = await context.params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, normalizeTablePreferenceInput)

    const receipt = await enforceMutationReceipt({
      scope: "account.tablePreferences.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const preference = await withMutationTelemetry(
      access,
      {
        message: "Table preference updated",
        action: "account.tablePreferences.update",
        route: "/api/account/table-preferences/[tableKey]",
        entityType: "userTablePreference",
        entityId: `${access.user.id}:${tableKey}`,
        details: { tableKey },
      },
      () => saveUserTablePreference(access.user.id, tableKey, input),
    )

    const responseBody = preference as Record<string, unknown>
    await finalizeMutationReceipt({
      scope: "account.tablePreferences.update",
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
