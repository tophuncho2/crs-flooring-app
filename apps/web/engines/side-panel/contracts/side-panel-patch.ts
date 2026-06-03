/**
 * Canonical "what changed" event a side-panel mutation emits to its host.
 *
 * The host applies the patch to whatever local snapshot it keeps (a flat array,
 * a per-scope map, …) so the surrounding surface stays in sync without a
 * refetch — while the engine's freshness controller separately invalidates the
 * registered query keys. The two are complementary: the patch keeps an
 * already-rendered host snapshot live; `invalidateRegistered()` keeps the
 * panel's own queries live.
 *
 * `scopeId` is an optional routing hint for hosts whose snapshot is bucketed
 * (e.g. the work-orders side keys adjustments by `workOrderItemId`); flat hosts
 * ignore it.
 *
 * A `delete` carries a `reason`: `"removed"` is a genuine deletion (the host
 * should drop the row and the panel should pop); `"relink-move"` is the
 * move-half of a relink (delete-from-old + upsert-into-new) that only matters
 * to a bucketed host — a flat host keeps the row and does NOT pop.
 *
 * This generalizes the adjustments module's `AdjustmentPanelPatch`
 * (`scopeId` == `workOrderItemId`, `row` == the adjustment). That type can adopt
 * this contract verbatim when the adjustments panel is migrated onto the engine.
 */
export type SidePanelPatch<TRow> =
  | { kind: "upsert"; row: TRow; scopeId?: string | null }
  | {
      kind: "delete"
      reason: "removed" | "relink-move"
      rowId: string
      scopeId?: string | null
    }
