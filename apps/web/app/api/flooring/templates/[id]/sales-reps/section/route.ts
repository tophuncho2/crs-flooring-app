import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import { saveTemplateSalesRepsSection } from "@/features/flooring/templates/mutations"
import { getTemplateById } from "@/features/flooring/templates/queries"
import { validateUpdateTemplateSalesRepsSectionInput } from "@/features/flooring/templates/validators"
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
    capability: "system.access",
    rateLimit: {
      scope: "templates.salesReps.section.replace",
      limit: 80,
      windowMs: 10 * 60 * 1000,
      route: "/api/flooring/templates/[id]/sales-reps/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateTemplateSalesRepsSectionInput, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = await getTemplateById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { template: currentSnapshot },
      message: "Template changed before section save completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "templates.salesReps.section.replace",
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
        message: "Template sales rep section replaced",
        action: "templates.salesReps.section.replace",
        route: "/api/flooring/templates/[id]/sales-reps/section",
        entityType: "flooringTemplate",
        entityId: id,
      },
      () => saveTemplateSalesRepsSection(id, input),
    )

    const responseBody = {
      template: await getTemplateById(id),
    }
    await finalizeMutationReceipt({
      scope: "templates.salesReps.section.replace",
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
