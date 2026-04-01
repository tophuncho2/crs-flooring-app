import { updateUnitOfMeasureUseCase } from "@builders/execution"
import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import { getUnitOfMeasureById } from "@/features/flooring/unit-of-measures/data/queries"
import { validateUpdateUnitOfMeasurePrimarySectionInput } from "@/features/flooring/unit-of-measures/application/manage-unit-of-measure"
import { UNIT_OF_MEASURES_TOOL_SLUG } from "@/features/flooring/shared/access/lookup-domains"
import { parseUuidParam } from "@/server/http/api-helpers"
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

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "unitOfMeasures.edit",
    toolSlug: UNIT_OF_MEASURES_TOOL_SLUG,
    rateLimit: {
      scope: "builder.unitOfMeasures.primary.section.replace",
      limit: 40,
      windowMs: 10 * 60 * 1000,
      route: "/api/builder/unit-of-measures/[id]/primary/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateUnitOfMeasurePrimarySectionInput, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = await getUnitOfMeasureById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { unitOfMeasure: currentSnapshot },
      message: "Unit of measure changed before section save completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "builder.unitOfMeasures.primary.section.replace",
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
        message: "Unit of measure primary section replaced",
        action: "builder.unitOfMeasures.primary.section.replace",
        route: "/api/builder/unit-of-measures/[id]/primary/section",
        entityType: "flooringUnitOfMeasure",
        entityId: id,
      },
      () => updateUnitOfMeasureUseCase(id, input),
    )

    const responseBody = {
      unitOfMeasure: await getUnitOfMeasureById(id),
    }
    await finalizeMutationReceipt({
      scope: "builder.unitOfMeasures.primary.section.replace",
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
