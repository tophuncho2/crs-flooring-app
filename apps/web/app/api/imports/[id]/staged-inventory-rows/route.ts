import { createStagedInventoryRowUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateCreateStagedInventoryRowBody } from "../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "imports.staged-inventory-rows.create",
      limit: 600,
      windowMs: 10 * 60 * 1000,
      route: "/api/imports/[id]/staged-inventory-rows",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreateStagedInventoryRowBody)

    const receipt = await enforceMutationReceipt({
      scope: "imports.staged-inventory-rows.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Staged inventory row created",
        action: "imports.staged-inventory-rows.create",
        route: "/api/imports/[id]/staged-inventory-rows",
        entityType: "flooringImportEntry",
        entityId: id,
      },
      () =>
        createStagedInventoryRowUseCase({
          importEntryId: id,
          filterRowId: input.filterRowId,
          form: input.form,
        }),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "imports.staged-inventory-rows.create",
      access,
      mutation,
      responseStatus: 200,
      responseBody: responseBody as unknown as Record<string, unknown>,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}
