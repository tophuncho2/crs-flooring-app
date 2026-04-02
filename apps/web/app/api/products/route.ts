import { createProductUseCase } from "@/modules/products/application/manage-product"
import { listCatalogProducts, listProductOptions } from "@/modules/products/data/queries"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { applyRoutePolicy, enforceMutationReceipt, finalizeMutationReceipt, parseMutationEnvelope } from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const catalogMode = searchParams.get("catalog") === "1"
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: catalogMode ? "products" : "warehouse",
    rateLimit: {
      scope: "query",
      limit: 100,
      windowMs: 60 * 1000,
      route: "/api/products",
    },
  })
  if (access instanceof Response) return access

  try {
    return routeJson(access, {
      products: catalogMode
        ? await listCatalogProducts(undefined, {
            searchQuery: "",
            isAscendingSort: true,
            isGroupingEnabled: false,
            groupByKeys: [],
          })
        : await listProductOptions(),
    })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: "products",
    rateLimit: {
      scope: "products.create",
      limit: 60,
      windowMs: 10 * 60 * 1000,
      route: "/api/products",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, (inputBody) => inputBody)

    const receipt = await enforceMutationReceipt({ scope: "products.create", request, access, mutation, body })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Product created",
        action: "products.create",
        route: "/api/products",
        entityType: "flooringProduct",
      },
      () => createProductUseCase(input),
    )

    const responseBody = { product: result }
    await finalizeMutationReceipt({ scope: "products.create", access, mutation, responseStatus: 201, responseBody })
    return routeJson(access, responseBody, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
