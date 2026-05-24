import { createProductUseCase, listProductsUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateCreateProductInput, validateListProductsQuery } from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/products")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateListProductsQuery(url.searchParams)
    const result = await listProductsUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_CREATE,
      scope: "products.create",
      route: "/api/products",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreateProductInput)

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
