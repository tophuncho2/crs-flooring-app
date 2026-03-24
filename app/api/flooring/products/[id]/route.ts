import { getProductById } from "@/features/flooring/products/data/queries"
import { deleteProductUseCase, updateProductUseCase } from "@/features/flooring/products/application/manage-product"
import { authorizeProductsRoute } from "@/features/flooring/shared/access/domain-tools"
import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import { enforceRouteRateLimit, requireRouteAccess, routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "products" })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    return routeJson(access, { product: await getProductById(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await authorizeProductsRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "products.update",
    limit: 80,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/products/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const product = await withMutationTelemetry(
      access,
      {
        message: "Product updated",
        action: "products.update",
        route: "/api/flooring/products/[id]",
        entityType: "flooringProduct",
        entityId: id,
      },
      () => updateProductUseCase(id, body),
    )
    return routeJson(access, { product })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await authorizeProductsRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "products.delete",
    limit: 40,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/products/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await context.params
    await withMutationTelemetry(
      access,
      {
        message: "Product deleted",
        action: "products.delete",
        route: "/api/flooring/products/[id]",
        entityType: "flooringProduct",
        entityId: id,
      },
      () => deleteProductUseCase(id),
    )
    return routeJson(access, { ok: true })
  } catch (error) {
    return routeError(access, error)
  }
}
