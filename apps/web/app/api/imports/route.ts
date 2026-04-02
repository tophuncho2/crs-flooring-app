import { listImportEntries } from "@/modules/imports/api"
import { createImportEntryUseCase } from "@/modules/imports/application/import-entry"
import { authorizeWarehouseRoute } from "@/modules/shared/access/domain-tools"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { applyRoutePolicy, enforceMutationReceipt, enforceQueryRateLimit, finalizeMutationReceipt, parseMutationEnvelope } from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/imports")
  if (rateLimited) return rateLimited

  try {
    return routeJson(access, { imports: await listImportEntries() })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "imports.write",
      limit: 50,
      windowMs: 10 * 60 * 1000,
      route: "/api/imports",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, (inputBody) => inputBody)

    const receipt = await enforceMutationReceipt({ scope: "imports.create", request, access, mutation, body })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Import created",
        action: "imports.create",
        route: "/api/imports",
        entityType: "flooringImportEntry",
      },
      () => createImportEntryUseCase(input),
    )

    const responseBody = { import: result }
    await finalizeMutationReceipt({ scope: "imports.create", access, mutation, responseStatus: 201, responseBody })
    return routeJson(access, responseBody, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
