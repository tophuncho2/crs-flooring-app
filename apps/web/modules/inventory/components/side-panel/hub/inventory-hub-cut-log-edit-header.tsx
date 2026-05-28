"use client"

import { useRouter } from "next/navigation"
import { canRelinkAdjustment } from "@builders/domain"
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
  const router = useRouter()
  const { local, isSaving } = cutLogPanel
  const { openCutLogPicker, cutLogPickerKind } = hubController

  const relinkAllowed = canRelinkAdjustment(cutLog)
  const triggersDisabled = isSaving || !relinkAllowed
  const linkedWorkOrderId = cutLogPanel.form.workOrderId ?? cutLog.workOrderId

  const workOrderTriggerLabel =
    local.pickedWorkOrderLabel ||
    (cutLog.workOrderNumber ? `#${cutLog.workOrderNumber}` : null)
  const workOrderItemTriggerLabel =
    local.pickedWorkOrderItemLabel ||
    cutLog.workOrderItemProductLabel ||
    cutLog.productName ||
    null
  // Notes mirror the label's picked-vs-row precedence so an empty picked-notes
  // (after re-linking to an item with no notes) doesn't fall back to the prior
  // row's notes.
  const materialItemNotes = local.pickedWorkOrderItemLabel
    ? local.pickedWorkOrderItemNotes
    : cutLog.workOrderItemNotes ?? ""
  // While a relink resolves, the WO is set but the WOMI isn't yet.
  const materialItemResolving = Boolean(cutLogPanel.form.workOrderId) && !cutLogPanel.form.workOrderItemId

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
          {!cutLogPanel.form.workOrderId ? (
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
            <CutLogStatusBadge status={cutLog.status} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
            Final sequence
          </span>
          <div className="flex h-9 items-center text-sm text-[var(--foreground)]/85">
            {cutLog.finalSequence != null ? String(cutLog.finalSequence) : "—"}
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
