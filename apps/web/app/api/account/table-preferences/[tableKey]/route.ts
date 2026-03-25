import {
  getUserTablePreference,
  normalizeTablePreferenceInput,
  saveUserTablePreference,
} from "@/server/account/table-preferences"
import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy } from "@/server/http/route-policy"

export async function GET(request: Request, context: { params: Promise<{ tableKey: string }> }) {
  const access = await applyRoutePolicy(request, { capability: "system.access" })
  if (access instanceof Response) return access

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
    const body = await request.json().catch(() => null)
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
      () => saveUserTablePreference(access.user.id, tableKey, normalizeTablePreferenceInput(body)),
    )

    return routeJson(access, preference)
  } catch (error) {
    return routeError(access, error)
  }
}
