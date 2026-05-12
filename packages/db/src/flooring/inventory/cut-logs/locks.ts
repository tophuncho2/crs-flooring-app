import { Prisma } from "@prisma/client"

/**
 * Single-inventory FOR UPDATE locker — the canonical mechanism every
 * cut-log mutation use case uses to serialize concurrent writers on a
 * given parent inventory. Acquires a row lock on the parent for the
 * duration of the caller's transaction.
 *
 * Consumers (sync per-row use cases — all under
 * `@builders/application/flooring/inventory/cut-logs`):
 *   - createPendingCutLogUseCase (WO-only)
 *   - updatePendingCutLogUseCase (scope-aware)
 *   - deletePendingCutLogUseCase (scope-aware)
 *   - finalizeCutLogUseCase      (scope-aware)
 *   - voidCutLogUseCase          (scope-aware)
 *
 * Cut-log mutations always touch exactly one inventory; concurrent
 * mutations against the same inventory serialize on this lock, and
 * concurrent mutations against different inventories run in parallel.
 *
 * Uses the standard single-id `Prisma.sql` pattern shared with every other
 * locker in the codebase (inventory-side pending-save / finalize / void,
 * `flooring_import_entry`, `flooring_work_order_file`).
 */
export async function lockInventoryForCutLog(
  tx: Prisma.TransactionClient,
  inventoryId: string,
): Promise<void> {
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "flooring_inventory" WHERE "id" = ${inventoryId} FOR UPDATE`,
  )
}
