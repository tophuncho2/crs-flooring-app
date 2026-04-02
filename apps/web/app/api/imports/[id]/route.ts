import { getImportEntryById } from "@/modules/imports/api"
import { deleteImportEntryUseCase, updateImportEntryUseCase } from "@/modules/imports/application/import-entry"
import { authorizeWarehouseRoute } from "@/modules/shared/access/domain-tools"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { applyRoutePolicy, assertExpectedUpdatedAt, enforceMutationReceipt, enforceQueryRateLimit, finalizeMutationReceipt, parseMutationEnvelope } from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/imports/[id]")
  if (rateLimited) return rateLimited

  try {
    const { id } = await context.params
    return routeJson(access, { import: await getImportEntryById(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "imports.write",
      limit: 50,
      windowMs: 10 * 60 * 1000,
      route: "/api/imports/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, (inputBody) => inputBody)

    const existing = await getImportEntryById(id)
    assertExpectedUpdatedAt(body, existing)

    const receipt = await enforceMutationReceipt({ scope: "imports.update", request, access, mutation, body })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Import updated",
        action: "imports.update",
        route: "/api/imports/[id]",
        entityType: "flooringImportEntry",
        entityId: id,
      },
      () => updateImportEntryUseCase(id, input),
    )

    const responseBody = { import: result }
    await finalizeMutationReceipt({ scope: "imports.update", access, mutation, responseStatus: 200, responseBody })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "imports.delete",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      route: "/api/imports/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { mutation } = parseMutationEnvelope(body, (inputBody) => inputBody)

    const existing = await getImportEntryById(id)
    assertExpectedUpdatedAt(body, existing)

    const receipt = await enforceMutationReceipt({ scope: "imports.delete", request, access, mutation, body })
    if (receipt.replay) return receipt.replay

    await withMutationTelemetry(
      access,
      {
        message: "Import deleted",
        action: "imports.delete",
        route: "/api/imports/[id]",
        entityType: "flooringImportEntry",
        entityId: id,
      },
      () => deleteImportEntryUseCase(id),
    )

    const responseBody = { ok: true }
    await finalizeMutationReceipt({ scope: "imports.delete", access, mutation, responseStatus: 200, responseBody })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}
