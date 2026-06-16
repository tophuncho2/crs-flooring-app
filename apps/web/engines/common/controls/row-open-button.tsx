"use client"

import { ArrowUpRight } from "lucide-react"
import { CellActionButton, type CellActionButtonProps } from "./cell-action-button"

/**
 * Row-level open affordance — the launch/arrow analog of the cell-level
 * `CellOpenButton`. Lives in the leading action gutter of list-view tables and
 * navigates to the row's record (a separate detail route), so it uses the
 * "launch" arrow rather than the pencil (which reads as inline-edit). Shares the
 * `CellActionButton` chrome + unconditional `stopPropagation`, so a click never
 * bubbles to the row. Navigation is injected by the consumer via `onClick`.
 */
export function RowOpenButton({ icon, ...props }: CellActionButtonProps) {
  return <CellActionButton {...props} icon={icon ?? <ArrowUpRight size={14} aria-hidden="true" />} />
}
