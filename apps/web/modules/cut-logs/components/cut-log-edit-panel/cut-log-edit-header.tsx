"use client"

import { isCutLogPendingEditable } from "@builders/domain"
import { CutLogStatusBadge } from "@/components/badges/cut-log-status-badge"
import { SidePanelEditPickerRow } from "@/components/side-panel-edit"
import type { CutLogPanelRow } from "@/modules/cut-logs/controllers/cut-log-side-panel"

export type CutLogEditHeaderProps = {
  cutLog: CutLogPanelRow
  isSaving: boolean
}

/**
 * Sticky-header content for the cut-log edit panel. Mirrors the template-sync
 * preview header layout: stacked pickers above non-editable context.
 *
 * Pickers are placeholders today — `onOpen` is unwired and the value reflects
 * the cut log's current snapshot (WO number, product label). The follow-up
 * pass swaps these for real menus that emit a `link` patch.
 */
export function CutLogEditHeader({ cutLog, isSaving }: CutLogEditHeaderProps) {
  const isPendingEditable = isCutLogPendingEditable(cutLog)
  const pickersDisabled = isSaving || !isPendingEditable

  return (
    <div className="flex flex-col gap-3">
      <SidePanelEditPickerRow
        label="Work order"
        value={cutLog.workOrderNumber ?? null}
        placeholder="Pick work order…"
        disabled={pickersDisabled}
        ariaLabel="Work order"
      />
      <SidePanelEditPickerRow
        label="Material item"
        value={cutLog.productName || cutLog.workOrderItemProductLabel || null}
        placeholder="Pick material item…"
        disabled={pickersDisabled}
        ariaLabel="Material item"
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
            Status
          </span>
          <div className="flex h-9 items-center">
            <CutLogStatusBadge status={cutLog.status} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
            Final sequence
          </span>
          <div className="flex h-9 items-center text-sm text-[var(--foreground)]/85">
            {cutLog.finalCutSequence != null ? String(cutLog.finalCutSequence) : "—"}
          </div>
        </div>
      </div>
    </div>
  )
}
