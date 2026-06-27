"use client"

import { Trash2 } from "lucide-react"
import { CellActionButton, type CellActionButtonProps } from "./cell-action-button"

/**
 * The canonical "delete row" affordance — a trash (Trash2) icon button over the
 * shared `CellActionButton` chrome, in the destructive (rose) tone. The
 * delete-row sibling of {@link RecordOpenButton}: one preset for the leading
 * action gutter of a table row (e.g. an editable record-view DataTable, where
 * an open ↗ button has no meaning and a per-row delete takes its place). The
 * removal handler is injected by the consumer via `onClick`; the inherited
 * unconditional `stopPropagation` keeps the click off any parent row handler.
 */
export function RecordDeleteButton({ icon, tone, ...props }: CellActionButtonProps) {
  return (
    <CellActionButton
      {...props}
      tone={tone ?? "destructive"}
      icon={icon ?? <Trash2 size={14} aria-hidden="true" />}
    />
  )
}
