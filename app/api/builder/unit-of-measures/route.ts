import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import { createUnitOfMeasure, listUnitOfMeasures, normalizeUnitOfMeasureInput } from "@/server/builder/unit-of-measures"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy } from "@/server/http/route-policy"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: "products",
  })
  if (access instanceof Response) return access

  try {
    return routeJson(access, { unitOfMeasures: await listUnitOfMeasures() })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "unitOfMeasures.edit",
    toolSlug: "products",
    rateLimit: {
      scope: "builder.unitOfMeasures.create",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      route: "/api/builder/unit-of-measures",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = await request.json().catch(() => null)
    const unitOfMeasure = await withMutationTelemetry(
      access,
      {
        message: "Unit of measure created",
        action: "builder.unitOfMeasures.create",
        route: "/api/builder/unit-of-measures",
        entityType: "flooringUnitOfMeasure",
      },
      () => createUnitOfMeasure(normalizeUnitOfMeasureInput(body).name),
    )

    return routeJson(access, { unitOfMeasure }, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
