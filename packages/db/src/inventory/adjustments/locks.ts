import { Prisma } from "../../generated/prisma/client.js"

/**
 * Single-inventory FOR UPDATE locker — the canonical mechanism every
 * adjustment mutation use case uses to serialize concurrent writers on a
 * given parent inventory. Acquires a row lock on the parent for the
 * duration of the caller's transaction.
 *
 * Consumers (sync per-row use cases — all under
 * `@builders/application/flooring/inventory/adjustments`):
 *   - createPendingAdjustmentUseCase (WO-linked DEDUCTION or manual)
 *   - updatePendingAdjustmentUseCase (scope-aware)
 *   - deletePendingAdjustmentUseCase (scope-aware)
 *
 * Adjustment mutations always touch exactly one inventory; concurrent
 * mutations against the same inventory serialize on this lock, and
 * concurrent mutations against different inventories run in parallel.
 *
 * Uses the standard single-id `Prisma.sql` pattern shared with every other
 * locker in the codebase.
 */
export async function lockInventoryForAdjustment(
  tx: Prisma.TransactionClient,
  inventoryId: string,
): Promise<void> {
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "flooring_inventory" WHERE "id" = ${inventoryId} FOR UPDATE`,
  )
}
