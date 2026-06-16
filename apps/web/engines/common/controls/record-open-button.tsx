"use client"

import { ArrowUpRight } from "lucide-react"
import { CellActionButton, type CellActionButtonProps } from "./cell-action-button"

/**
 * The canonical "open record" affordance — a launch (ArrowUpRight) icon button
 * over the shared `CellActionButton` chrome. One preset for every surface that
 * opens a record: the leading action gutter of list-view tables and the
 * label-row `actions` slot of record-view field cells. Navigation is injected by
 * the consumer via `onClick`; the unconditional `stopPropagation` keeps a click
 * off any parent row/cell handler.
 */
export function RecordOpenButton({ icon, ...props }: CellActionButtonProps) {
  return <CellActionButton {...props} icon={icon ?? <ArrowUpRight size={14} aria-hidden="true" />} />
}
