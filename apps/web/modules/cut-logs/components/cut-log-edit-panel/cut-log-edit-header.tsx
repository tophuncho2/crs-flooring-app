"use client"

import { canRelinkCutLog } from "@builders/domain"
import { CutLogStatusBadge } from "@/components/badges/cut-log-status-badge"
import { WorkOrderPicker } from "@/modules/work-orders/components/picker/work-order-picker"
import { WorkOrderMaterialItemPicker } from "@/modules/work-orders/components/picker/work-order-material-item-picker"
import type {
  CutLogEditPanelController,
  CutLogPanelRow,
} from "@/modules/cut-logs/controllers/cut-log-side-panel"

export type CutLogEditHeaderProps = {
  cutLog: CutLogPanelRow
  controller: CutLogEditPanelController
}

/**
 * Sticky-header content for the cut-log edit panel. Hosts the two
 * relink pickers (Work order + Material item) and the status / final-
 * sequence read-outs. The two pickers are enabled whenever the row is
 * relinkable (`canRelinkCutLog` — PENDING or FINAL, not voided / queued).
 * The cell-level form fields below the header (cut / notes / waste)
 * remain gated by `isCutLogPendingEditable`, so a FINAL row exposes the
 * pickers as live while keeping the value cells read-only.
 */
export function CutLogEditHeader({ cutLog, controller }: CutLogEditHeaderProps) {
  const { form, local, isSaving } = controller
  const relinkAllowed = canRelinkCutLog(cutLog)
  const pickersDisabled = isSaving || !relinkAllowed

  // Trigger label prefers the live picker snapshot once the user picks a
  // new option; falls back to the original cut log's label on first open.
  // Without this fallback the trigger would render the (stale) original
  // label even after `form.workOrderId` has flipped to the new selection.
  const workOrderTriggerLabel =
    local.pickedWorkOrderLabel || cutLog.workOrderNumber || null
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
        <WorkOrderPicker
          value={form.workOrderId}
          onChange={controller.setWorkOrderId}
          onOptionSelected={controller.snapshotWorkOrderOption}
          warehouseId={cutLog.warehouseId}
          selectedLabel={workOrderTriggerLabel}
          disabled={pickersDisabled}
          ariaLabel="Work order"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
          Material item
        </span>
        <WorkOrderMaterialItemPicker
          value={form.workOrderItemId}
          onChange={controller.setWorkOrderItemId}
          onOptionSelected={controller.snapshotWorkOrderItemOption}
          workOrderId={form.workOrderId}
          productId={cutLog.productId}
          selectedLabel={workOrderItemTriggerLabel}
          disabled={pickersDisabled}
          ariaLabel="Material item"
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
