import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import {
  deleteUnitOfMeasureRecord,
  replaceUnitOfMeasurePrimarySection,
  validateUpdateUnitOfMeasurePrimarySectionInput,
} from "@/features/flooring/unit-of-measures/application/manage-unit-of-measure"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy } from "@/server/http/route-policy"

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
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const unitOfMeasure = await withMutationTelemetry(
      access,
      {
        message: "Unit of measure updated",
        action: "builder.unitOfMeasures.update",
        route: "/api/builder/unit-of-measures/[id]",
        entityType: "flooringUnitOfMeasure",
        entityId: id,
      },
      () => replaceUnitOfMeasurePrimarySection(id, validateUpdateUnitOfMeasurePrimarySectionInput(body)),
    )

    return routeJson(access, { unitOfMeasure })
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

    return routeJson(access, { success: true })
  } catch (error) {
    return routeError(access, error)
  }
}
