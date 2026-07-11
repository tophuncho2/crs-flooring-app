import {
  deleteAdjustmentUseCase,
  getInventoryAdjustmentUseCase,
  updateAdjustmentUseCase,
} from "@builders/application"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceQueryRateLimit,
} from "@/server/http/route-policy"
import { createMutationRoute } from "@/server/http/run-mutation"
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
export const PATCH = createMutationRoute({
  scope: "inventory.adjustments.update",
  route: "/api/inventory/[id]/adjustments/[adjustmentId]",
  rateLimit: { limit: 1200, windowMs: 10 * 60 * 1000 },
  // OCC is enforced inside the use case via `expectedUpdatedAt`, not a route
  // snapshot assert — so require it here and thread it through.
  requireExpectedUpdatedAt: true,
  parseParams: async (raw) => {
    const p = raw as { id: string; adjustmentId: string }
    return {
      inventoryId: parseUuidParam(p.id, "id"),
      adjustmentId: parseUuidParam(p.adjustmentId, "adjustmentId"),
    }
  },
  parseInput: validateUpdateAdjustmentInput,
  useCase: ({ input, access, params, mutation }) =>
    updateAdjustmentUseCase(
      {
        scope: { kind: "inventory", inventoryId: params.inventoryId },
        adjustmentId: params.adjustmentId,
        expectedUpdatedAt: mutation.expectedUpdatedAt!,
        patch: input.patch,
      },
      access.user.email,
    ),
  telemetry: ({ params }) => ({
    message: "Adjustment updated (inv-side)",
    action: "inventory.adjustments.update",
    entityType: "flooringAdjustment",
    entityId: params.adjustmentId,
  }),
  status: 200,
  buildResponseBody: ({ result }) => result as unknown as Record<string, unknown>,
})

/**
 * DELETE /api/inventory/[id]/adjustments/[adjustmentId]
 *
 * Synchronous delete for a single adjustment under the inventory
 * scope. OCC-gated; any adjustment is freely deletable. Returns 200 with the parent
 * inventory's recomputed `netDeducted`.
 */
export const DELETE = createMutationRoute({
  scope: "inventory.adjustments.delete",
  route: "/api/inventory/[id]/adjustments/[adjustmentId]",
  rateLimit: { limit: 600, windowMs: 10 * 60 * 1000 },
  // OCC is enforced inside the use case via `expectedUpdatedAt`.
  requireExpectedUpdatedAt: true,
  parseParams: async (raw) => {
    const p = raw as { id: string; adjustmentId: string }
    return {
      inventoryId: parseUuidParam(p.id, "id"),
      adjustmentId: parseUuidParam(p.adjustmentId, "adjustmentId"),
    }
  },
  parseInput: validateDeleteAdjustmentInput,
  useCase: ({ access, params, mutation }) =>
    deleteAdjustmentUseCase({
      scope: { kind: "inventory", inventoryId: params.inventoryId },
      adjustmentId: params.adjustmentId,
      expectedUpdatedAt: mutation.expectedUpdatedAt!,
    }),
  telemetry: ({ params }) => ({
    message: "Adjustment deleted (inv-side)",
    action: "inventory.adjustments.delete",
    entityType: "flooringAdjustment",
    entityId: params.adjustmentId,
  }),
  status: 200,
  buildResponseBody: ({ result }) => result as unknown as Record<string, unknown>,
})
