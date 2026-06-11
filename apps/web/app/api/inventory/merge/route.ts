import { mergeInventoryUseCase } from "@builders/application"
import { getInventoryDetailById } from "@builders/db"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateMergeInventoryInput } from "../_validators"

/**
 * POST /api/inventory/merge — consolidate several inventory rows of one product
 * into a single new row. Synchronous create (no worker / outbox): the use case
 * locks every source row, asserts the single-product invariant, sums the
 * remaining balance into the new row's starting stock, inserts it (no import /
 * PO# provenance), and flags the sources `wasMerged`. No expected-updated-at
 * check (fresh insert); the mutation receipt guards against double-merge on retry.
 */
export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_CREATE,
      scope: "inventory.merge",
      route: "/api/inventory/merge",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateMergeInventoryInput, {
      requireExpectedUpdatedAt: false,
    })

    const receipt = await enforceMutationReceipt({
      scope: "inventory.merge",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Inventory rows merged",
        action: "inventory.merge",
        route: "/api/inventory/merge",
        entityType: "flooringInventory",
      },
      () => mergeInventoryUseCase(input),
    )

    // Return the full detail (row + adjustments) so the client can seed the new
    // row's record view. A merged row always opens with zero adjustments. Skip
    // the stepper neighbor lookups — the merge flow only navigates off this result.
    const detail = (await getInventoryDetailById(result.id, { withNeighbors: false })) ?? result
    const responseBody = { inventory: detail }
    await finalizeMutationReceipt({
      scope: "inventory.merge",
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
