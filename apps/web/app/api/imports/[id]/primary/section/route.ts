import { getImportById, getImportDetailById } from "@builders/db"
import { ImportExecutionError, updateImportUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateUpdateImportInput } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_UPDATE_SECTION,
      scope: "imports.primary.section.replace",
      route: "/api/imports/[id]/primary/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateImportInput, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getImportById(id)
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

    const receipt = await enforceMutationReceipt({
      scope: "imports.primary.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Import primary section updated",
        action: "imports.primary.section.replace",
        route: "/api/imports/[id]/primary/section",
        entityType: "flooringImportEntry",
        entityId: id,
      },
      () => updateImportUseCase(id, input),
    )

    // Client controller expects ImportDetailRecord (row + id-pointer arrays for
    // staged + live inventory) so the record view's section reconciliation
    // stays consistent. Use case returns the flat row; compose the detail at
    // the route boundary — mirrors the inventory primary section route pattern.
    const detail = (await getImportDetailById(id)) ?? result
    const responseBody = { import: detail }
    await finalizeMutationReceipt({
      scope: "imports.primary.section.replace",
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
