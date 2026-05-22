"use client"

import { canRelinkCutLog } from "@builders/domain"
import { CutLogStatusBadge } from "@/components/badges/cut-log-status-badge"
import { HubSidePanelPickerTrigger } from "@/components/hub-side-panel"
import type {
  CutLogEditPanelController,
  CutLogPanelRow,
} from "@/modules/cut-logs/controllers/cut-log-side-panel"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"

export type InventoryHubCutLogEditHeaderProps = {
  cutLog: CutLogPanelRow
  cutLogPanel: CutLogEditPanelController
  hubController: InventoryHubSidePanelController
}

/**
 * Hub-scoped cut-log edit header. Mirrors the standalone panel's
 * `CutLogEditHeader` but swaps the popover relink pickers for inline
 * `HubSidePanelPickerTrigger` buttons that open a body-takeover picker
 * (template-sync pattern). Status badge + final-cut-sequence remain
 * unchanged.
 *
 * Trigger labels prefer the live picker snapshot once the user picks a
 * new option, falling back to the original cut log's labels otherwise —
 * matches the standalone panel's fallback behavior so the trigger doesn't
 * stall on the prior selection after a relink.
 */
export function InventoryHubCutLogEditHeader({
  cutLog,
  cutLogPanel,
  hubController,
}: InventoryHubCutLogEditHeaderProps) {
  const { local, isSaving } = cutLogPanel
  const { openCutLogPicker, cutLogPickerKind } = hubController

  const relinkAllowed = canRelinkCutLog(cutLog)
  const triggersDisabled = isSaving || !relinkAllowed

  const workOrderTriggerLabel =
    local.pickedWorkOrderLabel ||
    (cutLog.workOrderNumber ? `#${cutLog.workOrderNumber}` : null)
  const workOrderItemTriggerLabel =
    local.pickedWorkOrderItemLabel ||
    cutLog.workOrderItemProductLabel ||
    cutLog.productName ||
    null

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
          Work order
        </span>
        <HubSidePanelPickerTrigger
          expanded={cutLogPickerKind === "workOrder"}
          onToggle={() => openCutLogPicker("workOrder")}
          selectedLabel={workOrderTriggerLabel}
          placeholder="Select work order"
          disabled={triggersDisabled}
          disabledPlaceholder={
            cutLog.workOrderId ? formatWorkOrderTriggerFallback(cutLog) : "Locked"
          }
          ariaLabel="Open work order picker"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
          Material item
        </span>
        <HubSidePanelPickerTrigger
          expanded={cutLogPickerKind === "workOrderItem"}
          onToggle={() => openCutLogPicker("workOrderItem")}
          selectedLabel={workOrderItemTriggerLabel}
          placeholder="Select material item"
          disabled={triggersDisabled || !cutLogPanel.form.workOrderId}
          disabledPlaceholder={
            cutLogPanel.form.workOrderId
              ? workOrderItemTriggerLabel ?? "Locked"
              : "Select work order first"
          }
          ariaLabel="Open material item picker"
        />
      </label>
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

function formatWorkOrderTriggerFallback(cutLog: CutLogPanelRow): string {
  if (cutLog.workOrderNumber) return `#${cutLog.workOrderNumber}`
  return "Locked"
}
