import { createProductUseCase } from "@builders/application"
import { listProducts, listProductOptions } from "@builders/db"
import { PRODUCTS_TOOL_SLUG } from "@/modules/shared/access/tool-slugs"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateProductInput } from "./_validators"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const catalogMode = searchParams.get("catalog") === "1"
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: catalogMode ? PRODUCTS_TOOL_SLUG : "warehouse",
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/products")
  if (rateLimited) return rateLimited

  try {
    return routeJson(access, {
      products: catalogMode ? await listProducts() : await listProductOptions(),
    })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: PRODUCTS_TOOL_SLUG,
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
    const { input, mutation } = parseMutationEnvelope(body, validateProductInput)

    const receipt = await enforceMutationReceipt({
      scope: "products.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const product = await withMutationTelemetry(
      access,
      {
        message: "Product created",
        action: "products.create",
        route: "/api/products",
        entityType: "flooringProduct",
      },
      () => createProductUseCase(input),
    )

    const responseBody = { product }
    await finalizeMutationReceipt({
      scope: "products.create",
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
