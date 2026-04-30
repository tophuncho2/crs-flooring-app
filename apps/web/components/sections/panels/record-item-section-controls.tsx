"use client"

import type { ReactNode } from "react"
import { RecordItemCell } from "@/modules/shared/engines/record-view/sections/cells/record-item-cell"
import { RecordRowDeleteButton } from "@/modules/shared/engines/record-view/sections/rows/record-row-delete-button"
import { RecordRowOpenButton } from "@/modules/shared/engines/record-view/sections/rows/record-row-open-button"
import { RecordRowToggleButton } from "@/modules/shared/engines/record-view/sections/rows/record-row-toggle-button"
import { resolveRecordSectionCapabilities, type RecordSectionCapabilities } from "../structure/record-section-capabilities"

export type RecordItemSectionControlsProps = {
  capabilities?: RecordSectionCapabilities
  toggle?: {
    columnKey?: string
    label?: string
    expanded: boolean
    onToggle: () => void
    ariaLabel: string
  }
  open?: {
    columnKey?: string
    label?: string
    onOpen: () => void
    loading?: boolean
  }
  status?: {
    columnKey?: string
    label?: string
    content: ReactNode
  }
  remove?: {
    columnKey?: string
    label?: string
    onRemove: () => void
    disabled?: boolean
    children?: ReactNode
  }
  cellChrome?: "card" | "grid"
  showCellLabels?: boolean
}

export function RecordItemSectionControls({
  capabilities,
  toggle,
  open,
  status,
  remove,
  cellChrome = "card",
  showCellLabels = true,
}: RecordItemSectionControlsProps) {
  const resolvedCapabilities = resolveRecordSectionCapabilities("item", capabilities)

  return (
    <>
      {resolvedCapabilities.supportsScopedRows && toggle ? (
        <RecordItemCell
          label={toggle.label ?? "Show / Hide"}
          columnKey={toggle.columnKey ?? "toggle"}
          chrome={cellChrome}
          showLabel={showCellLabels}
        >
          <div className="flex min-h-[2.5rem] items-center justify-center">
            <RecordRowToggleButton
              expanded={toggle.expanded}
              onToggle={toggle.onToggle}
              ariaLabel={toggle.ariaLabel}
            />
          </div>
        </RecordItemCell>
      ) : null}

      {resolvedCapabilities.supportsOpenRow && open ? (
        <RecordItemCell
          label={open.label ?? "Open"}
          columnKey={open.columnKey ?? "open"}
          chrome={cellChrome}
          showLabel={showCellLabels}
        >
          <div className="flex min-h-[2.5rem] items-center justify-center">
            <RecordRowOpenButton onOpen={open.onOpen} loading={open.loading} />
          </div>
        </RecordItemCell>
      ) : null}

      {resolvedCapabilities.supportsStatusColumn && status ? (
        <RecordItemCell
          label={status.label ?? "Status"}
          columnKey={status.columnKey ?? "status"}
          chrome={cellChrome}
          showLabel={showCellLabels}
        >
          <div className="flex min-h-[2.5rem] items-center">{status.content}</div>
        </RecordItemCell>
      ) : null}

      {resolvedCapabilities.supportsRemoveRow && remove ? (
        <RecordItemCell
          label={remove.label ?? "Remove"}
          columnKey={remove.columnKey ?? "remove"}
          chrome={cellChrome}
          showLabel={showCellLabels}
        >
          <div className="flex min-h-[2.5rem] items-center justify-start xl:justify-end">
            <RecordRowDeleteButton onClick={remove.onRemove} disabled={remove.disabled}>
              {remove.children ?? "Remove"}
            </RecordRowDeleteButton>
          </div>
        </RecordItemCell>
      ) : null}
    </>
  )
}
