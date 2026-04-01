import {
  deleteCategoryUseCase,
  updateCategoryUseCase,
} from "@builders/application"
import { getCategoryById } from "@builders/db"
import { validateCategoryPrimarySectionInput } from "@/modules/categories/transport/validate-category-input"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { CATEGORIES_TOOL_SLUG } from "@/modules/shared/access/lookup-domains"
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
    capability: "categories.edit",
    toolSlug: CATEGORIES_TOOL_SLUG,
    rateLimit: {
      scope: "categories.update",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/categories/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCategoryPrimarySectionInput, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = await getCategoryById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { category: currentSnapshot },
      message: "Category changed before save completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "categories.update",
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
        message: "Category updated",
        action: "categories.update",
        route: "/api/categories/[id]",
        entityType: "flooringCategory",
        entityId: id,
      },
      () => updateCategoryUseCase(id, input),
    )

    const responseBody = {
      category,
    }
    await finalizeMutationReceipt({
      scope: "categories.update",
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
    capability: "categories.edit",
    toolSlug: CATEGORIES_TOOL_SLUG,
    rateLimit: {
      scope: "categories.delete",
      limit: 10,
      windowMs: 10 * 60 * 1000,
      route: "/api/categories/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = await getCategoryById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { category: currentSnapshot },
      message: "Category changed before delete completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "categories.delete",
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
        message: "Category deleted",
        action: "categories.delete",
        route: "/api/categories/[id]",
        entityType: "flooringCategory",
        entityId: id,
      },
      () => deleteCategoryUseCase(id),
    )
    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "categories.delete",
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
