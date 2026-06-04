import { getImportDetailById } from "@builders/db"
import { ImportExecutionError, deleteImportUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/imports/[id]")
  if (rateLimited) return rateLimited

  try {
    const { id } = await context.params
    return routeJson(access, { import: await getImportDetailById(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_DELETE,
      scope: "imports.delete",
      route: "/api/imports/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { mutation } = parseMutationEnvelope(body, (inputBody) => inputBody, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getImportDetailById(id)
    if (!currentSnapshot) {
      throw new ImportExecutionError({
        code: "IMPORT_NOT_FOUND",
        message: "Import not found.",
        status: 404,
      })
    }
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { import: currentSnapshot },
      message: "Import changed before save completed. Refresh and try again.",
    })

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
      () => deleteImportUseCase(id),
    )

    const responseBody = { ok: true }
    await finalizeMutationReceipt({ scope: "imports.delete", access, mutation, responseStatus: 200, responseBody })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}
