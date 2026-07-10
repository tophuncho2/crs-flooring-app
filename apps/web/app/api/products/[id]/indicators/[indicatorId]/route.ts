import {
  deleteIndicatorUseCase,
  getIndicatorUseCase,
  updateIndicatorUseCase,
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
  validateDeleteIndicatorInput,
  validateUpdateIndicatorInput,
} from "@/app/api/inventory-indicators/_validators"

type RouteContext = {
  params: Promise<{ id: string; indicatorId: string }>
}

/**
 * GET /api/products/[id]/indicators/[indicatorId]
 *
 * Single indicator read (with prev/next neighbors) scoped to its parent product.
 * Powers deep-linking into a specific indicator (the standalone list row → the
 * product record view at `?indicator=<id>`) when the row isn't on the section's
 * first loaded page. Returns `{ indicator }`, or 404 when it doesn't exist /
 * doesn't belong to this product.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/products/[id]/indicators/[indicatorId]",
  )
  if (rateLimited) return rateLimited

  try {
    const { id: rawId, indicatorId: rawIndicatorId } = await params
    const productId = parseUuidParam(rawId, "id")
    const indicatorId = parseUuidParam(rawIndicatorId, "indicatorId")

    const indicator = await getIndicatorUseCase({ productId, indicatorId })
    if (!indicator) {
      return routeJson(access, { error: "Inventory indicator not found" }, { status: 404 })
    }
    return routeJson(access, { indicator })
  } catch (error) {
    return routeError(access, error)
  }
}

/**
 * PATCH /api/products/[id]/indicators/[indicatorId]
 *
 * Synchronous update of one indicator's editable subset (threshold / notes /
 * active) under the product scope. OCC-guarded via `expectedUpdatedAt`. Returns
 * 200 with the updated row (status re-derived from live stock).
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      scope: "products.indicators.update",
      limit: 1200,
      windowMs: 10 * 60 * 1000,
      route: "/api/products/[id]/indicators/[indicatorId]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId, indicatorId: rawIndicatorId } = await params
    const productId = parseUuidParam(rawId, "id")
    const indicatorId = parseUuidParam(rawIndicatorId, "indicatorId")

    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(
      body,
      validateUpdateIndicatorInput,
      { requireExpectedUpdatedAt: true },
    )

    const receipt = await enforceMutationReceipt({
      scope: "products.indicators.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Inventory indicator updated",
        action: "products.indicators.update",
        route: "/api/products/[id]/indicators/[indicatorId]",
        entityType: "flooringInventoryIndicator",
        entityId: indicatorId,
      },
      () =>
        updateIndicatorUseCase(
          {
            productId,
            indicatorId,
            expectedUpdatedAt: mutation.expectedUpdatedAt!,
            patch: input.patch,
          },
          access.user.email,
        ),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "products.indicators.update",
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

/**
 * DELETE /api/products/[id]/indicators/[indicatorId]
 *
 * Synchronous delete of one indicator under the product scope. OCC-guarded.
 * Returns 200 `{ ok: true }`.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      scope: "products.indicators.delete",
      limit: 600,
      windowMs: 10 * 60 * 1000,
      route: "/api/products/[id]/indicators/[indicatorId]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId, indicatorId: rawIndicatorId } = await params
    const productId = parseUuidParam(rawId, "id")
    const indicatorId = parseUuidParam(rawIndicatorId, "indicatorId")

    const body = (await request.json()) as Record<string, unknown>
    const { input: _input, mutation } = parseMutationEnvelope(
      body,
      validateDeleteIndicatorInput,
      { requireExpectedUpdatedAt: true },
    )

    const receipt = await enforceMutationReceipt({
      scope: "products.indicators.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    await withMutationTelemetry(
      access,
      {
        message: "Inventory indicator deleted",
        action: "products.indicators.delete",
        route: "/api/products/[id]/indicators/[indicatorId]",
        entityType: "flooringInventoryIndicator",
        entityId: indicatorId,
      },
      () =>
        deleteIndicatorUseCase({
          productId,
          indicatorId,
          expectedUpdatedAt: mutation.expectedUpdatedAt!,
        }),
    )

    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "products.indicators.delete",
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
