"use client"

import { HubSidePanelPickerTrigger } from "@/components/hub-side-panel"
import type {
  AdjustmentEditPanelController,
  AdjustmentPanelPickerKind,
} from "@/modules/adjustments/controllers/adjustment-side-panel"

const LABEL_CLASS = "text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65"

export type AdjustmentPickerStackProps = {
  controller: AdjustmentEditPanelController
  /** Open the picked inventory in the inventory hub (WO surface wires this). */
  onOpenInventory?: (inventoryId: string) => void
  /** Navigate to the linked work order (e.g. router.push to its record page). */
  onOpenWorkOrder?: (workOrderId: string) => void
}

/**
 * The shared, config-driven sticky-header picker stack. Both the standalone WO
 * panel and the inventory hub render this identically; the per-context
 * `pickerConfig` decides which pickers are editable, locked (disabled trigger
 * showing its value), or hidden. The material-item block is always a read-only
 * display, auto-linked from the chosen work order.
 *
 * Pickers that search by warehouse (inventory / location / work-order) are
 * additionally gated until a warehouse is chosen.
 */
export function AdjustmentPickerStack({
  controller,
  onOpenInventory,
  onOpenWorkOrder,
}: AdjustmentPickerStackProps) {
  const { pickerConfig, pickerKind, isSaving, warehouseId, form, local } = controller
  if (!pickerConfig) return null

  const noWarehouse = warehouseId === null
  const trigger = (kind: AdjustmentPanelPickerKind) => ({
    expanded: pickerKind === kind,
    onToggle: () => controller.openPicker(kind),
  })

  const showWorkOrder = pickerConfig.workOrder !== "hidden"
  const woEditable = pickerConfig.workOrder === "editable"
  const showWarehouse = pickerConfig.warehouse !== "hidden"
  const whEditable = pickerConfig.warehouse === "editable"
  const showInventory = pickerConfig.inventory !== "hidden"
  const invEditable = pickerConfig.inventory === "editable"
  const showLocation = pickerConfig.location !== "hidden"
  const locEditable = pickerConfig.location === "editable"

  const workOrderItemLabel = local.pickedWorkOrderItemLabel
  const materialItemResolving = Boolean(form.workOrderId) && !form.workOrderItemId

  return (
    <div className="flex flex-col gap-3">
      {showWarehouse ? (
        <label className="flex flex-col gap-1.5">
          <span className={LABEL_CLASS}>Warehouse</span>
          <HubSidePanelPickerTrigger
            {...trigger("warehouse")}
            selectedLabel={local.pickedWarehouseLabel || null}
            placeholder="Select warehouse"
            disabled={isSaving || !whEditable}
            ariaLabel="Open warehouse picker"
          />
        </label>
      ) : null}

      {showInventory ? (
        <label className="flex flex-col gap-1.5">
          <span className={LABEL_CLASS}>Inventory</span>
          <HubSidePanelPickerTrigger
            {...trigger("inventory")}
            selectedLabel={local.pickedInventoryLabel || null}
            placeholder="Select inventory"
            disabled={isSaving || !invEditable || (invEditable && noWarehouse)}
            disabledPlaceholder={
              invEditable && noWarehouse ? "Select warehouse first" : undefined
            }
            ariaLabel="Open inventory picker"
            onOpenLinked={
              onOpenInventory && form.inventoryId
                ? () => onOpenInventory(form.inventoryId)
                : undefined
            }
            openLinkedAriaLabel="Open inventory"
            openLinkedDisabled={isSaving}
          />
        </label>
      ) : null}

      {showLocation ? (
        <label className="flex flex-col gap-1.5">
          <span className={LABEL_CLASS}>Location filter</span>
          <HubSidePanelPickerTrigger
            {...trigger("location")}
            selectedLabel={local.locationFilter || null}
            placeholder="Select location"
            disabled={isSaving || !locEditable || (locEditable && noWarehouse)}
            disabledPlaceholder={
              locEditable && noWarehouse ? "Select warehouse first" : undefined
            }
            ariaLabel="Open location filter picker"
          />
        </label>
      ) : null}

      {showWorkOrder ? (
        <>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL_CLASS}>Work order</span>
            <HubSidePanelPickerTrigger
              {...trigger("workOrder")}
              selectedLabel={local.pickedWorkOrderLabel || null}
              placeholder="Select work order"
              disabled={isSaving || !woEditable || (woEditable && noWarehouse)}
              disabledPlaceholder={
                woEditable && noWarehouse ? "Select warehouse first" : undefined
              }
              ariaLabel="Open work order picker"
              onOpenLinked={
                onOpenWorkOrder && form.workOrderId
                  ? () => onOpenWorkOrder(form.workOrderId!)
                  : undefined
              }
              openLinkedAriaLabel="Open work order"
              openLinkedDisabled={isSaving}
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className={LABEL_CLASS}>Material item</span>
            {/* Read-only: auto-linked from the selected work order (product is
                fixed + unique per WO), so there is no picker. */}
            <div className="flex flex-col gap-1 rounded-md border border-[var(--panel-border)] bg-[var(--panel-border)]/10 px-3 py-2">
              {!form.workOrderId ? (
                <span className="text-sm text-[var(--foreground)]/55">
                  Select a work order to auto-link its material item
                </span>
              ) : materialItemResolving ? (
                <span className="text-sm text-[var(--foreground)]/55">Resolving…</span>
              ) : (
                <>
                  <span className="text-sm text-[var(--foreground)]">
                    {workOrderItemLabel || "—"}
                  </span>
                  <span className="text-xs text-[var(--foreground)]/60">
                    {local.pickedWorkOrderItemNotes.trim() ? local.pickedWorkOrderItemNotes : "—"}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-[var(--foreground)]/45">
                    Auto-linked from work order
                  </span>
                </>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
