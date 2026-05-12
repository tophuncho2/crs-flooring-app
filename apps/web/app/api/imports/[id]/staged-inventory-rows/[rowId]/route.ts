import {
  deleteStagedInventoryRowUseCase,
  updateStagedInventoryRowUseCase,
} from "@builders/application"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  validateDeleteStagedInventoryRowBody,
  validateUpdateStagedInventoryRowBody,
} from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string; rowId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "imports.staged-inventory-rows.update",
      limit: 1200,
      windowMs: 10 * 60 * 1000,
      route: "/api/imports/[id]/staged-inventory-rows/[rowId]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id, rowId } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(
      body,
      validateUpdateStagedInventoryRowBody,
      { requireExpectedUpdatedAt: true },
    )

    const receipt = await enforceMutationReceipt({
      scope: "imports.staged-inventory-rows.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Staged inventory row updated",
        action: "imports.staged-inventory-rows.update",
        route: "/api/imports/[id]/staged-inventory-rows/[rowId]",
        entityType: "flooringImportStagedInventoryRow",
        entityId: rowId,
      },
      () =>
        updateStagedInventoryRowUseCase({
          importEntryId: id,
          rowId,
          expectedUpdatedAt: mutation.expectedUpdatedAt!,
          form: input.form,
        }),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "imports.staged-inventory-rows.update",
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

export async function DELETE(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "imports.staged-inventory-rows.delete",
      limit: 600,
      windowMs: 10 * 60 * 1000,
      route: "/api/imports/[id]/staged-inventory-rows/[rowId]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id, rowId } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input: _input, mutation } = parseMutationEnvelope(
      body,
      validateDeleteStagedInventoryRowBody,
      { requireExpectedUpdatedAt: true },
    )

    const receipt = await enforceMutationReceipt({
      scope: "imports.staged-inventory-rows.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Staged inventory row deleted",
        action: "imports.staged-inventory-rows.delete",
        route: "/api/imports/[id]/staged-inventory-rows/[rowId]",
        entityType: "flooringImportStagedInventoryRow",
        entityId: rowId,
      },
      () =>
        deleteStagedInventoryRowUseCase({
          importEntryId: id,
          rowId,
          expectedUpdatedAt: mutation.expectedUpdatedAt!,
        }),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "imports.staged-inventory-rows.delete",
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
