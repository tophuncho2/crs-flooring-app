import { createUnitOfMeasureUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { validateUpdateUnitOfMeasurePrimarySectionInput } from "@/modules/unit-of-measures/application/manage-unit-of-measure"
import { listUnitOfMeasures } from "@/server/builder/unit-of-measures"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: "products",
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/builder/unit-of-measures")
  if (rateLimited) return rateLimited

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
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateUnitOfMeasurePrimarySectionInput)

    const receipt = await enforceMutationReceipt({
      scope: "builder.unitOfMeasures.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const unitOfMeasure = await withMutationTelemetry(
      access,
      {
        message: "Unit of measure created",
        action: "builder.unitOfMeasures.create",
        route: "/api/builder/unit-of-measures",
        entityType: "flooringUnitOfMeasure",
      },
      () => createUnitOfMeasureUseCase(input),
    )

    const responseBody = { unitOfMeasure }
    await finalizeMutationReceipt({
      scope: "builder.unitOfMeasures.create",
      access,
      mutation,
      responseStatus: 201,
      responseBody,
    })
    return routeJson(access, responseBody, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
