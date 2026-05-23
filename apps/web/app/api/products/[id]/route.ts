import { deleteProductUseCase, ProductExecutionError } from "@builders/application"
import { getProductById } from "@builders/db"
import { PRODUCTS_TOOL_SLUG } from "@/modules/shared/access/tool-slugs"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: PRODUCTS_TOOL_SLUG,
    rateLimit: {
      ...CRUD_DELETE,
      scope: "products.delete",
      route: "/api/products/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value, {
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
      message: "Product changed before delete completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "products.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    await withMutationTelemetry(
      access,
      {
        message: "Product deleted",
        action: "products.delete",
        route: "/api/products/[id]",
        entityType: "flooringProduct",
        entityId: id,
      },
      () => deleteProductUseCase(id),
    )

    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "products.delete",
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
