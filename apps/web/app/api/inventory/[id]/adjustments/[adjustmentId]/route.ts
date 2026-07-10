import {
  deleteAdjustmentUseCase,
  getInventoryAdjustmentUseCase,
  updateAdjustmentUseCase,
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
  validateDeleteAdjustmentInput,
  validateUpdateAdjustmentInput,
} from "@/app/api/adjustments/_validators"

type RouteContext = {
  params: Promise<{ id: string; adjustmentId: string }>
}

/**
 * GET /api/inventory/[id]/adjustments/[adjustmentId]
 *
 * Single enriched adjustment read scoped to its parent inventory. Powers
 * deep-linking into a specific adjustment (the adjustments ledger row → the
 * inventory record view at `?adjustment=<id>`) when the row isn't on the
 * record view's first loaded page. Returns `{ adjustment }`, or 404 when the
 * adjustment doesn't exist / doesn't belong to this inventory.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/inventory/[id]/adjustments/[adjustmentId]",
  )
  if (rateLimited) return rateLimited

  try {
    const { id: rawId, adjustmentId: rawAdjustmentId } = await params
    const inventoryId = parseUuidParam(rawId, "id")
    const adjustmentId = parseUuidParam(rawAdjustmentId, "adjustmentId")

    const adjustment = await getInventoryAdjustmentUseCase({ inventoryId, adjustmentId })
    if (!adjustment) {
      return routeJson(access, { error: "Adjustment not found" }, { status: 404 })
    }
    return routeJson(access, { adjustment })
  } catch (error) {
    return routeError(access, error)
  }
}

/**
 * PATCH /api/inventory/[id]/adjustments/[adjustmentId]
 *
 * Synchronous update for a single adjustment under the inventory
 * scope. Calls `updateAdjustmentUseCase` with
 * `{ scope: { kind: "inventory", inventoryId } }`. The use case loads
 * the row, asserts scope membership, runs the OCC gate,
 * applies any link patch (with WOMI re-link validity check), locks the
 * parent inventory FOR UPDATE, applies the patch (always re-snapping
 * `location` from the parent), recomputes `netDeducted`, and asserts
 * the invariant. Returns 200 with the updated row.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      scope: "inventory.adjustments.update",
      limit: 1200,
      windowMs: 10 * 60 * 1000,
      route: "/api/inventory/[id]/adjustments/[adjustmentId]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId, adjustmentId: rawAdjustmentId } = await params
    const inventoryId = parseUuidParam(rawId, "id")
    const adjustmentId = parseUuidParam(rawAdjustmentId, "adjustmentId")

    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(
      body,
      validateUpdateAdjustmentInput,
      { requireExpectedUpdatedAt: true },
    )

    const receipt = await enforceMutationReceipt({
      scope: "inventory.adjustments.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Adjustment updated (inv-side)",
        action: "inventory.adjustments.update",
        route: "/api/inventory/[id]/adjustments/[adjustmentId]",
        entityType: "flooringAdjustment",
        entityId: adjustmentId,
      },
      () =>
        updateAdjustmentUseCase({
          scope: { kind: "inventory", inventoryId },
          adjustmentId: adjustmentId,
          expectedUpdatedAt: mutation.expectedUpdatedAt!,
          patch: input.patch,
        }, access.user.email),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "inventory.adjustments.update",
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
 * DELETE /api/inventory/[id]/adjustments/[adjustmentId]
 *
 * Synchronous delete for a single adjustment under the inventory
 * scope. OCC-gated; any adjustment is freely deletable. Returns 200 with the parent
 * inventory's recomputed `netDeducted`.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      scope: "inventory.adjustments.delete",
      limit: 600,
      windowMs: 10 * 60 * 1000,
      route: "/api/inventory/[id]/adjustments/[adjustmentId]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId, adjustmentId: rawAdjustmentId } = await params
    const inventoryId = parseUuidParam(rawId, "id")
    const adjustmentId = parseUuidParam(rawAdjustmentId, "adjustmentId")

    const body = (await request.json()) as Record<string, unknown>
    const { input: _input, mutation } = parseMutationEnvelope(
      body,
      validateDeleteAdjustmentInput,
      { requireExpectedUpdatedAt: true },
    )

    const receipt = await enforceMutationReceipt({
      scope: "inventory.adjustments.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Adjustment deleted (inv-side)",
        action: "inventory.adjustments.delete",
        route: "/api/inventory/[id]/adjustments/[adjustmentId]",
        entityType: "flooringAdjustment",
        entityId: adjustmentId,
      },
      () =>
        deleteAdjustmentUseCase({
          scope: { kind: "inventory", inventoryId },
          adjustmentId: adjustmentId,
          expectedUpdatedAt: mutation.expectedUpdatedAt!,
        }),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "inventory.adjustments.delete",
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
