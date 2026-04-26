// Internal helper: builds a CSS Grid `grid-template-columns` value from a
// GridLayout. Header and body rows share the result so columns line up across
// the whole grid.
//
// Layout:
//   leadingControls (fixed widths) | dataColumns (minmax(preferred, growfr)) | trailingControls (fixed widths)
//
// A data column with `grow: 0` collapses to a fixed-width track using its
// preferred width — this matches the engine's behavior and lets consumers
// pin a data column without moving it into the controls zone.

import type { GridColumn } from "../contracts/grid-column"
import type { GridControlColumn } from "../contracts/grid-control-column"
import type { GridLayout } from "../contracts/grid-layout"
import type { GridRow } from "../contracts/grid-row"

function toCssLength(value: number | string): string {
  return typeof value === "number" ? `${value / 16}rem` : value
}

function buildDataColumnTrack<TRow extends GridRow>(column: GridColumn<TRow>): string {
  const minWidth = toCssLength(column.minWidth)
  const preferredWidth = column.preferredWidth ? toCssLength(column.preferredWidth) : minWidth
  const grow = column.grow ?? 0

  if (grow <= 0) {
    return preferredWidth
  }
  return `minmax(${preferredWidth}, ${grow}fr)`
}

function buildControlTrack(control: GridControlColumn): string {
  return toCssLength(control.width)
}

export function buildGridTemplateColumns<TRow extends GridRow>(layout: GridLayout<TRow>): string {
  const tracks: string[] = []

  if (layout.leadingControls) {
    for (const control of layout.leadingControls) {
      tracks.push(buildControlTrack(control))
    }
  }

  for (const column of layout.dataColumns) {
    tracks.push(buildDataColumnTrack(column))
  }

  if (layout.trailingControls) {
    for (const control of layout.trailingControls) {
      tracks.push(buildControlTrack(control))
    }
  }

  return tracks.join(" ")
}
