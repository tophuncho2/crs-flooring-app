import type { InventoryAdjustmentRow } from "./types.js"

/**
 * Newest-first chronological order for adjustment rows: `createdAt` DESC with an
 * `id` DESC tiebreak (ids are random uuids — deterministic, not chronological).
 * Mirrors the canonical ledger `orderBy: [{ createdAt: "desc" }, { id: "desc" }]`
 * used by the inventory + standalone adjustment reads. ISO `createdAt` strings
 * compare lexicographically. Accepts any row carrying `createdAt`/`id`.
 */
export function compareAdjustmentsByRecency(
  a: Pick<InventoryAdjustmentRow, "createdAt" | "id">,
  b: Pick<InventoryAdjustmentRow, "createdAt" | "id">,
): number {
  if (a.createdAt !== b.createdAt) return a.createdAt > b.createdAt ? -1 : 1
  return a.id > b.id ? -1 : a.id < b.id ? 1 : 0
}
