import { createCategoryUseCase } from "@builders/application"
import { listCategories } from "@builders/db"
import { validateCategoryPrimarySectionInput } from "@/modules/categories/transport/validate-category-input"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { CATEGORIES_TOOL_SLUG } from "@/modules/shared/access/lookup-domains"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceQueryRateLimit,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: CATEGORIES_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/categories")
  if (rateLimited) return rateLimited

  try {
    return routeJson(access, { categories: await listCategories() })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "categories.edit",
    toolSlug: CATEGORIES_TOOL_SLUG,
    rateLimit: {
      scope: "categories.create",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/categories",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCategoryPrimarySectionInput)

    const receipt = await enforceMutationReceipt({
      scope: "categories.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const category = await withMutationTelemetry(
      access,
      {
        message: "Category created",
        action: "categories.create",
        route: "/api/categories",
        entityType: "flooringCategory",
      },
      () => createCategoryUseCase(input),
    )

    const responseBody = { category }
    await finalizeMutationReceipt({
      scope: "categories.create",
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
