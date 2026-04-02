import { getProductById } from "@/modules/products/data/queries"
import { deleteProductUseCase, updateProductUseCase } from "@/modules/products/application/manage-product"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { applyRoutePolicy, assertExpectedUpdatedAt, enforceMutationReceipt, finalizeMutationReceipt, parseMutationEnvelope } from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: "products",
    rateLimit: {
      scope: "query",
      limit: 100,
      windowMs: 60 * 1000,
      route: "/api/products/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    return routeJson(access, { product: await getProductById(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "products",
    rateLimit: {
      scope: "products.update",
      limit: 80,
      windowMs: 10 * 60 * 1000,
      route: "/api/products/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, (inputBody) => inputBody)

    const existing = await getProductById(id)
    assertExpectedUpdatedAt(body, existing)

    const receipt = await enforceMutationReceipt({ scope: "products.update", request, access, mutation, body })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Product updated",
        action: "products.update",
        route: "/api/products/[id]",
        entityType: "flooringProduct",
        entityId: id,
      },
      () => updateProductUseCase(id, input),
    )

    const responseBody = { product: result }
    await finalizeMutationReceipt({ scope: "products.update", access, mutation, responseStatus: 200, responseBody })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "products",
    rateLimit: {
      scope: "products.delete",
      limit: 40,
      windowMs: 10 * 60 * 1000,
      route: "/api/products/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { mutation } = parseMutationEnvelope(body, (inputBody) => inputBody)

    const existing = await getProductById(id)
    assertExpectedUpdatedAt(body, existing)

    const receipt = await enforceMutationReceipt({ scope: "products.delete", request, access, mutation, body })
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

    const responseBody = { ok: true }
    await finalizeMutationReceipt({ scope: "products.delete", access, mutation, responseStatus: 200, responseBody })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}
