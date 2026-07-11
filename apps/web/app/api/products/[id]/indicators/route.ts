import {
  createIndicatorUseCase,
  listIndicatorsForProductUseCase,
} from "@builders/application"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceQueryRateLimit,
} from "@/server/http/route-policy"
import { createMutationRoute } from "@/server/http/run-mutation"
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
export const POST = createMutationRoute({
  scope: "products.indicators.create",
  route: "/api/products/[id]/indicators",
  rateLimit: { limit: 600, windowMs: 10 * 60 * 1000 },
  parseParams: async (raw) => ({ productId: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateCreateIndicatorInput,
  useCase: ({ input, access, params }) =>
    createIndicatorUseCase(
      {
        productId: params.productId,
        warehouseId: input.warehouseId,
        unitId: input.unitId,
        lowStockThreshold: input.lowStockThreshold,
        internalNotes: input.internalNotes,
        isActive: input.isActive,
      },
      access.user.email,
    ),
  telemetry: ({ params }) => ({
    message: "Inventory indicator created",
    action: "products.indicators.create",
    entityType: "flooringProduct",
    entityId: params.productId,
  }),
  status: 200,
  // Bare use-case result (not wrapped in a { indicator } envelope).
  buildResponseBody: ({ result }) => result as unknown as Record<string, unknown>,
})
