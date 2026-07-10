import {
  createIndicatorUseCase,
  listIndicatorsForProductUseCase,
} from "@builders/application"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import {
  validateCreateIndicatorInput,
  validateIndicatorsPageQuery,
} from "@/app/api/inventory-indicators/_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/products/[id]/indicators
 *
 * Paginated read of inventory indicators on a single product. Powers the product
 * record view's indicators section. Returns `{ page: InventoryIndicatorPage }`.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/products/[id]/indicators",
  )
  if (rateLimited) return rateLimited

  try {
    const { id: rawId } = await params
    const productId = parseUuidParam(rawId, "id")
    const url = new URL(request.url)
    const { skip, take } = validateIndicatorsPageQuery(url.searchParams)
    const result = await listIndicatorsForProductUseCase({ productId, skip, take })
    return routeJson(access, { page: result })
  } catch (error) {
    return routeError(access, error)
  }
}

/**
 * POST /api/products/[id]/indicators
 *
 * Synchronous create of one indicator (one per product/warehouse/unit triple) on
 * this product. Calls `createIndicatorUseCase`, which validates the form, checks
 * the product/warehouse/unit exist, and inserts (the DB `@@unique` surfaces a
 * duplicate triple as 409). Returns 200 with the inserted row.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      scope: "products.indicators.create",
      limit: 600,
      windowMs: 10 * 60 * 1000,
      route: "/api/products/[id]/indicators",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const productId = parseUuidParam(rawId, "id")

    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreateIndicatorInput)

    const receipt = await enforceMutationReceipt({
      scope: "products.indicators.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Inventory indicator created",
        action: "products.indicators.create",
        route: "/api/products/[id]/indicators",
        entityType: "flooringProduct",
        entityId: productId,
      },
      () =>
        createIndicatorUseCase(
          {
            productId,
            warehouseId: input.warehouseId,
            unitId: input.unitId,
            lowStockThreshold: input.lowStockThreshold,
            internalNotes: input.internalNotes,
            isActive: input.isActive,
          },
          access.user.email,
        ),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "products.indicators.create",
      access,
      mutation,
      responseStatus: 200,
      responseBody: responseBody as unknown as Record<string, unknown>,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}
