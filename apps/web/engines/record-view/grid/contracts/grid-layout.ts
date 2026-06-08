// GridLayout bundles a grid's data columns with optional fixed-width control
// columns at either end. The grid renders leadingControls → dataColumns →
// trailingControls in template order; the CSS Grid `grid-template-columns`
// concatenates `<fixed-width>` segments for control zones with
// `minmax(preferredWidth, growFr)` segments for the data zone.

import type { GridColumn } from "./grid-column"
import type { GridControlColumn } from "./grid-control-column"
import type { GridRow } from "./grid-row"

export type GridLayout<TRow extends GridRow> = {
  dataColumns: ReadonlyArray<GridColumn<TRow>>
  /** Fixed-width control columns rendered before data (e.g. selection checkbox). */
  leadingControls?: ReadonlyArray<GridControlColumn>
  /** Fixed-width control columns rendered after data (e.g. delete button). */
  trailingControls?: ReadonlyArray<GridControlColumn>
}
