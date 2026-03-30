import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import { getUnitOfMeasureById } from "@/features/flooring/unit-of-measures/data/queries"
import {
  deleteUnitOfMeasureRecord,
  replaceUnitOfMeasurePrimarySection,
  validateUpdateUnitOfMeasurePrimarySectionInput,
} from "@/features/flooring/unit-of-measures/application/manage-unit-of-measure"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "unitOfMeasures.edit",
    toolSlug: "products",
    rateLimit: {
      scope: "builder.unitOfMeasures.update",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      route: "/api/builder/unit-of-measures/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateUnitOfMeasurePrimarySectionInput, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = await getUnitOfMeasureById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { unitOfMeasure: currentSnapshot },
      message: "Unit of measure changed before save completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "builder.unitOfMeasures.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }
    const unitOfMeasure = await withMutationTelemetry(
      access,
      {
        message: "Unit of measure updated",
        action: "builder.unitOfMeasures.update",
        route: "/api/builder/unit-of-measures/[id]",
        entityType: "flooringUnitOfMeasure",
        entityId: id,
      },
      () => replaceUnitOfMeasurePrimarySection(id, input),
    )
    const responseBody = { unitOfMeasure }
    await finalizeMutationReceipt({
      scope: "builder.unitOfMeasures.update",
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

export async function DELETE(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "unitOfMeasures.edit",
    toolSlug: "products",
    rateLimit: {
      scope: "builder.unitOfMeasures.delete",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/builder/unit-of-measures/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = await getUnitOfMeasureById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { unitOfMeasure: currentSnapshot },
      message: "Unit of measure changed before delete completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "builder.unitOfMeasures.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }
    await withMutationTelemetry(
      access,
      {
        message: "Unit of measure deleted",
        action: "builder.unitOfMeasures.delete",
        route: "/api/builder/unit-of-measures/[id]",
        entityType: "flooringUnitOfMeasure",
        entityId: id,
      },
      () => deleteUnitOfMeasureRecord(id),
    )
    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "builder.unitOfMeasures.delete",
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
