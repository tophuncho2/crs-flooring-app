import { updateCategoryUseCase } from "@builders/execution"
import { getCategoryById } from "@builders/db"
import { validateCategoryPrimarySectionInput } from "@/features/flooring/categories/transport/validate-category-input"
import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import { CATEGORIES_TOOL_SLUG } from "@/features/flooring/shared/access/lookup-domains"
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
    capability: "categories.edit",
    toolSlug: CATEGORIES_TOOL_SLUG,
    rateLimit: {
      scope: "categories.primary.section.replace",
      limit: 40,
      windowMs: 10 * 60 * 1000,
      route: "/api/flooring/categories/[id]/primary/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCategoryPrimarySectionInput, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = await getCategoryById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { category: currentSnapshot },
      message: "Category changed before section save completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "categories.primary.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }

    const category = await withMutationTelemetry(
      access,
      {
        message: "Category primary section replaced",
        action: "categories.primary.section.replace",
        route: "/api/flooring/categories/[id]/primary/section",
        entityType: "flooringCategory",
        entityId: id,
      },
      () => updateCategoryUseCase(id, input),
    )

    const responseBody = { category }
    await finalizeMutationReceipt({
      scope: "categories.primary.section.replace",
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
