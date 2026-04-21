import { getImportById } from "@builders/db"
import { saveImportInventoryRowsUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateInventoryRowsDiffBody } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "imports.inventory-rows.section.replace",
      limit: 50,
      windowMs: 10 * 60 * 1000,
      route: "/api/imports/[id]/inventory-rows/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input: diff, mutation } = parseMutationEnvelope(body, validateInventoryRowsDiffBody, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getImportById(id)
    if (!currentSnapshot) {
      return routeError(access, new Error("Import not found"))
    }
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { import: currentSnapshot },
      message: "Import changed before save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "imports.inventory-rows.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const { importEntry, tempIdMap } = await withMutationTelemetry(
      access,
      {
        message: "Import inventory rows saved",
        action: "imports.inventory-rows.section.replace",
        route: "/api/imports/[id]/inventory-rows/section",
        entityType: "flooringImportEntry",
        entityId: id,
      },
      () => saveImportInventoryRowsUseCase(id, diff),
    )

    const responseBody = { import: importEntry, tempIdMap }
    await finalizeMutationReceipt({
      scope: "imports.inventory-rows.section.replace",
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
