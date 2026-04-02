import { authorizeWarehouseRoute } from "@/modules/shared/access/domain-tools"
import { createCutLogUseCase, listCutLogsUseCase } from "@/modules/inventory/application/cut-logs"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/cut-logs")
  if (rateLimited) return rateLimited

  try {
    const { searchParams } = new URL(request.url)
    const inventoryId = searchParams.get("inventoryId")?.trim() || null
    return routeJson(access, { cutLogs: await listCutLogsUseCase(inventoryId) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "inventory.cutLogs.write",
      limit: 50,
      windowMs: 10 * 60 * 1000,
      route: "/api/cut-logs",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, (inputBody) => inputBody)
    const receipt = await enforceMutationReceipt({
      scope: "cutLogs.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const cutLog = await withMutationTelemetry(
      access,
      {
        message: "Cut log created",
        action: "inventory.cutLogs.create",
        route: "/api/cut-logs",
        entityType: "flooringCutLog",
      },
      () => createCutLogUseCase(input),
    )

    const responseBody = { cutLog }
    await finalizeMutationReceipt({
      scope: "cutLogs.create",
      access,
      mutation,
      responseStatus: 201,
      responseBody,
    })
    return routeJson(access, responseBody, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
