import type { GridLayout } from "@/components/grid"
import type { ImportFilterRowDraft } from "@/modules/imports/controllers/record/drafts"

/**
 * Filter-row parent grid layout. Mirrors the work-order material-items
 * section's layout shape:
 *   - leading expand toggle
 *   - editable category filter + product picker
 *   - editable stockOrdered (UnitCell)
 *   - read-only remainingStock (computed: stockOrdered − sum(child startingStock))
 *   - trailing remove control (blocked when row has children)
 */
export const FILTER_ROW_LAYOUT: GridLayout<ImportFilterRowDraft & { id: string }> = {
  leadingControls: [{ key: "expand", kind: "expand", width: 36 }],
  dataColumns: [
    { key: "categoryFilter", label: "Filter", minWidth: 140, grow: 0 },
    { key: "product", label: "Product", minWidth: 220, preferredWidth: 320, grow: 1.5 },
    {
      key: "stockOrdered",
      label: "Stock Ordered",
      kind: "number",
      minWidth: 156,
      grow: 0,
      align: "center",
    },
    {
      key: "remainingStock",
      label: "Remaining",
      kind: "number",
      minWidth: 132,
      grow: 0,
      align: "center",
    },
  ],
  trailingControls: [{ key: "remove", kind: "actions", width: 56 }],
}
