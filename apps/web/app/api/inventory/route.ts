import { createInventoryUseCase, listInventoryUseCase } from "@builders/application"
import { getInventoryDetailById } from "@builders/db"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"
import { validateCreateInventoryInput, validateListInventoryQuery } from "./_validators"

export const GET = createQueryRoute({
  route: "/api/inventory",
  parseInput: (searchParams) => validateListInventoryQuery(searchParams),
  useCase: ({ input }) => listInventoryUseCase(input),
})

/**
 * POST /api/inventory — manually create one inventory row from a selected
 * product + warehouse. Synchronous create (no worker / outbox), no import or
 * PO# provenance. Snapshot columns are derived from the product server-side;
 * the body carries only the product/warehouse ids + editable fields. No
 * expected-updated-at check (fresh insert); the mutation receipt guards
 * against double-creation on retry.
 */
export const POST = createMutationRoute({
  scope: "inventory.create",
  route: "/api/inventory",
  rateLimit: CRUD_CREATE,
  requireExpectedUpdatedAt: false,
  parseInput: validateCreateInventoryInput,
  useCase: ({ input, access }) => createInventoryUseCase(input, access.user.email),
  telemetry: {
    action: "inventory.create",
    message: "Inventory item created",
    entityType: "flooringInventory",
  },
  status: 200,
  // Return the full detail (row + adjustments) so the hub can seed its view on
  // the brand-new row. A fresh row always has zero adjustments. Skip the
  // stepper neighbor lookups — the create flow only navigates/invalidates off
  // this result, never seeds the stepper-read detail query.
  buildResponseBody: async ({ result }) => {
    const detail = (await getInventoryDetailById(result.id, { withNeighbors: false })) ?? result
    return { inventory: detail }
  },
})
