import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { ProductExecutionError, updateProductUseCase } from "@builders/application"
import { getProductById } from "@builders/db"
import { validateProductInput } from "../../../_validators"
import { PRODUCTS_TOOL_SLUG } from "@/modules/shared/access/tool-slugs"
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
    toolSlug: PRODUCTS_TOOL_SLUG,
    rateLimit: {
      scope: "products.primary.section.replace",
      limit: 40,
      windowMs: 10 * 60 * 1000,
      route: "/api/products/[id]/primary/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateProductInput, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = await getProductById(id)
    if (!currentSnapshot) {
      throw new ProductExecutionError({
        code: "PRODUCT_NOT_FOUND",
        message: "Product not found",
        status: 404,
      })
    }
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { product: currentSnapshot },
      message: "Product changed before section save completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "products.primary.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }

    const result = await withMutationTelemetry(
      access,
      {
        message: "Product primary section replaced",
        action: "products.primary.section.replace",
        route: "/api/products/[id]/primary/section",
        entityType: "flooringProduct",
        entityId: id,
      },
      () => updateProductUseCase(id, input),
    )

    const responseBody = {
      product: result,
    }
    await finalizeMutationReceipt({
      scope: "products.primary.section.replace",
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
