/**
 * Snapshot of the parent inventory's identity fields (number, optional
 * item number, optional dye lot, category slug) at cut-log create time.
 * Stamped onto the cut log on insert and never mutated afterward —
 * mirrors the `PendingCutLogUnitSnapshot` pattern for unit labels.
 *
 * Why snapshot instead of join-on-read: the cut-log subgrid renders
 * `inventoryNumber - itemNumber - dyeLot` per row; reading from the cut
 * log row directly retires the per-WOMI eligible-inventory fetch the UI
 * uses today as a label lookup. Frozen fields also keep the cut log
 * truthful even if the parent inventory is later edited or archived.
 *
 * Note: `notes` is intentionally NOT in this snapshot. Inventory `notes`
 * is mutable working-state (a scratchpad), so freezing it onto the cut
 * log would surface stale text. It remains a live field on inventory
 * and is only rendered in create-mode dropdown subtitles.
 */
export type PendingCutLogInventorySnapshot = {
  inventoryNumber: string
  itemNumber: string | null
  dyeLot: string | null
  categorySlug: string
}

/**
 * Project a parent-inventory row's identity fields into the snapshot
 * shape. The function body is a projection — its purpose is to give the
 * application use case a single named seam, the same way the inline
 * unit-snapshot construction in `createPendingCutLogUseCase` does.
 */
export function buildPendingCutLogInventorySnapshot(
  inv: PendingCutLogInventorySnapshot,
): PendingCutLogInventorySnapshot {
  return {
    inventoryNumber: inv.inventoryNumber,
    itemNumber: inv.itemNumber,
    dyeLot: inv.dyeLot,
    categorySlug: inv.categorySlug,
  }
}
