/**
 * Snapshot of the parent inventory's identity at cut-log create time.
 * Stamped onto the cut log on insert and never mutated afterward — mirrors
 * the `PendingCutLogUnitSnapshot` pattern for unit labels.
 *
 * The cut log persists both:
 *   - `inventoryItem` — the composed display string from the parent
 *     inventory's `inventoryItem` column (formula: `inventoryNumber ·
 *     {rollPrefix+rollNumber} · dyeLot · note` — see `composeInventoryItem`
 *     in `../../formatters.ts`). The cut log copies it verbatim; no
 *     recomposition. **Location is NOT part of the formula** and never
 *     appears in `inventoryItem`.
 *   - The 5 underlying primitives (`inventoryNumber` / `rollPrefix` /
 *     `rollNumber` / `dyeLot` / `inventoryNote`) — stamped here for
 *     queryability / future render flexibility.
 *
 * `categorySlug` stays on the snapshot because cut-log routing logic keys
 * off it after create.
 *
 * `location` is NOT part of this type. It is a denormalized mirror (re-
 * stamped on create / update / finalize, cleared on void) carried as a
 * separate parameter alongside the snapshot through the data + application
 * layers.
 *
 * All 5 primitive fields are nullable so the snapshot can be reused on
 * pre-migration cut log records (which surface as null) and to mirror the
 * cut log schema columns.
 */
export type PendingCutLogInventorySnapshot = {
  inventoryItem: string
  categorySlug: string
  inventoryNumber: string | null
  rollPrefix: string | null
  rollNumber: string | null
  dyeLot: string | null
  inventoryNote: string | null
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
    inventoryNumber: inv.inventoryNumber,
    rollPrefix: inv.rollPrefix,
    rollNumber: inv.rollNumber,
    dyeLot: inv.dyeLot,
    inventoryNote: inv.inventoryNote,
  }
}
