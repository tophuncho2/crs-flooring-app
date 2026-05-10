/**
 * Snapshot of the parent inventory's identity at cut-log create time.
 * Stamped onto the cut log on insert and never mutated afterward — mirrors
 * the `PendingCutLogUnitSnapshot` pattern for unit labels.
 *
 * Post-sweep: collapsed to a single `inventoryItem` field plus
 * `categorySlug`. The denormalized `inventory.inventoryItem` column already
 * encodes `inventoryNumber · rollNumber · location · dyeLot · note` (the
 * inventory update use case keeps it current via `composeInventoryItem`),
 * so the cut log copies it verbatim — no recomposition. `categorySlug`
 * stays separate for cut-log routing logic.
 *
 * Frozen fields keep the cut log truthful even if the parent inventory is
 * later edited or archived.
 */
export type PendingCutLogInventorySnapshot = {
  inventoryItem: string
  categorySlug: string
}

/**
 * Project a parent-inventory row's identity into the snapshot shape. The
 * function body is a projection — its purpose is to give the application
 * use case a single named seam, the same way the inline unit-snapshot
 * construction in `createPendingCutLogUseCase` does.
 */
export function buildPendingCutLogInventorySnapshot(
  inv: PendingCutLogInventorySnapshot,
): PendingCutLogInventorySnapshot {
  return {
    inventoryItem: inv.inventoryItem,
    categorySlug: inv.categorySlug,
  }
}
