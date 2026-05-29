"use client"

import { useRouter } from "next/navigation"
import { canRelinkAdjustment } from "@builders/domain"
import { AdjustmentStatusBadge } from "@/components/badges/adjustment-status-badge"
import { HubSidePanelPickerTrigger } from "@/components/hub-side-panel"
import type {
  AdjustmentEditPanelController,
  AdjustmentPanelRow,
} from "@/modules/adjustments/controllers/adjustment-side-panel"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"

export type InventoryHubAdjustmentEditHeaderProps = {
  adjustment: AdjustmentPanelRow
  adjustmentPanel: AdjustmentEditPanelController
  hubController: InventoryHubSidePanelController
}

/**
 * Hub-scoped adjustment edit header. Mirrors the standalone panel's
 * `AdjustmentEditHeader` but swaps the popover relink pickers for inline
 * `HubSidePanelPickerTrigger` buttons that open a body-takeover picker
 * (template-sync pattern). Status badge + final-cut-sequence remain
 * unchanged.
 *
 * Trigger labels prefer the live picker snapshot once the user picks a
 * new option, falling back to the original adjustment's labels otherwise —
 * matches the standalone panel's fallback behavior so the trigger doesn't
 * stall on the prior selection after a relink.
 */
export function InventoryHubAdjustmentEditHeader({
  adjustment,
  adjustmentPanel,
  hubController,
}: InventoryHubAdjustmentEditHeaderProps) {
  const router = useRouter()
  const { local, isSaving } = adjustmentPanel
  const { openAdjustmentPicker, adjustmentPickerKind } = hubController

  const relinkAllowed = canRelinkAdjustment(adjustment)
  const triggersDisabled = isSaving || !relinkAllowed
  const linkedWorkOrderId = adjustmentPanel.form.workOrderId ?? adjustment.workOrderId

  const workOrderTriggerLabel =
    local.pickedWorkOrderLabel ||
    (adjustment.workOrderNumber ? `#${adjustment.workOrderNumber}` : null)
  const workOrderItemTriggerLabel =
    local.pickedWorkOrderItemLabel ||
    adjustment.workOrderItemProductLabel ||
    adjustment.productName ||
    null
  // Notes mirror the label's picked-vs-row precedence so an empty picked-notes
  // (after re-linking to an item with no notes) doesn't fall back to the prior
  // row's notes.
  const materialItemNotes = local.pickedWorkOrderItemLabel
    ? local.pickedWorkOrderItemNotes
    : adjustment.workOrderItemNotes ?? ""
  // While a relink resolves, the WO is set but the WOMI isn't yet.
  const materialItemResolving = Boolean(adjustmentPanel.form.workOrderId) && !adjustmentPanel.form.workOrderItemId

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
          Work order
        </span>
        <HubSidePanelPickerTrigger
          expanded={adjustmentPickerKind === "workOrder"}
          onToggle={() => openAdjustmentPicker("workOrder")}
          selectedLabel={workOrderTriggerLabel}
          placeholder="Select work order"
          disabled={triggersDisabled}
          disabledPlaceholder={
            adjustment.workOrderId ? formatWorkOrderTriggerFallback(adjustment) : "Locked"
          }
          ariaLabel="Open work order picker"
          onOpenLinked={
            linkedWorkOrderId
              ? () => router.push(`/dashboard/work-orders/${linkedWorkOrderId}`)
              : undefined
          }
          openLinkedAriaLabel="Open work order"
          openLinkedDisabled={isSaving}
        />
      </label>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
          Material item
        </span>
        {/* Read-only: auto-linked from the selected work order (product is
            fixed + unique per WO), so there is no picker — just the product
            and its notes. */}
        <div className="flex flex-col gap-1 rounded-md border border-[var(--panel-border)] bg-[var(--panel-border)]/10 px-3 py-2">
          {!adjustmentPanel.form.workOrderId ? (
            <span className="text-sm text-[var(--foreground)]/55">
              Select a work order to auto-link its material item
            </span>
          ) : materialItemResolving ? (
            <span className="text-sm text-[var(--foreground)]/55">Resolving…</span>
          ) : (
            <>
              <span className="text-sm text-[var(--foreground)]">
                {workOrderItemTriggerLabel ?? "—"}
              </span>
              <span className="text-xs text-[var(--foreground)]/60">
                {materialItemNotes.trim() ? materialItemNotes : "—"}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-[var(--foreground)]/45">
                Auto-linked from work order
              </span>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
            Status
          </span>
          <div className="flex h-9 items-center">
            <AdjustmentStatusBadge status={adjustment.status} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
            Final sequence
          </span>
          <div className="flex h-9 items-center text-sm text-[var(--foreground)]/85">
            {adjustment.finalSequence != null ? String(adjustment.finalSequence) : "—"}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatWorkOrderTriggerFallback(adjustment: AdjustmentPanelRow): string {
  if (adjustment.workOrderNumber) return `#${adjustment.workOrderNumber}`
  return "Locked"
}
