"use client"

import { HubSidePanelPickerTrigger } from "@/components/hub-side-panel"
import { FieldSection, FormField } from "@/components/fields"
import { SectionCard } from "@/components/headers"
import { CellAt } from "@/components/layout-grid/cell-at"
import type {
  AdjustmentEditPanelController,
  AdjustmentPanelPickerKind,
} from "@/modules/adjustments/controllers/adjustment-side-panel"
import { InventoryIdentityFields } from "./inventory-identity-fields"

export type AdjustmentPickerStackProps = {
  controller: AdjustmentEditPanelController
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
 * Layout mirrors the form body's group cards (`AdjustmentEditFormFields`): two
 * `SectionCard` groups built on `FieldSection` / `CellAt` / `FormField` — a
 * "Source" group (warehouse / inventory / location filter) and a "Work order"
 * group (work order + auto-linked material item).
 *
 * Pickers that search by warehouse (inventory / location / work-order) are
 * additionally gated until a warehouse is chosen. The location filter is a
 * search-narrowing aid, so the edit config hides it.
 */
export function AdjustmentPickerStack({
  controller,
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

  const inventoryIdentityValues = {
    invNumber: local.pickedInventoryNumber,
    rollNumber: local.pickedInventoryRollNumber,
    dyeLot: local.pickedInventoryDyeLot,
    note: local.pickedInventoryNote,
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionCard title="Source" tone="neutral">
        <FieldSection gap="0.75rem">
          {showWarehouse ? (
            <CellAt col={1} colSpan={8}>
              <FormField label="Warehouse">
                <HubSidePanelPickerTrigger
                  {...trigger("warehouse")}
                  selectedLabel={local.pickedWarehouseLabel || null}
                  placeholder="Select warehouse"
                  disabled={isSaving || !whEditable}
                  ariaLabel="Open warehouse picker"
                />
              </FormField>
            </CellAt>
          ) : null}

          {showInventory ? (
            <CellAt col={1} colSpan={8}>
              <FormField label="Inventory">
                {invEditable ? (
                  <InventoryIdentityFields
                    mode="editable"
                    values={inventoryIdentityValues}
                    expanded={pickerKind === "inventory"}
                    onToggle={() => controller.openPicker("inventory")}
                    disabled={isSaving || noWarehouse}
                    disabledPlaceholder={noWarehouse ? "Select warehouse first" : undefined}
                  />
                ) : (
                  <InventoryIdentityFields mode="locked" values={inventoryIdentityValues} />
                )}
              </FormField>
            </CellAt>
          ) : null}

          {showLocation ? (
            <CellAt col={1} colSpan={8}>
              <FormField label="Location filter">
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
              </FormField>
            </CellAt>
          ) : null}
        </FieldSection>
      </SectionCard>

      {showWorkOrder ? (
        <SectionCard title="Work order" tone="neutral">
          <FieldSection gap="0.75rem">
            <CellAt col={1} colSpan={8}>
              <FormField label="Work order">
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
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              {/* Read-only: auto-linked from the selected work order (product is
                  fixed + unique per WO), so there is no picker — product name only. */}
              <FormField label="Material item">
                {!form.workOrderId ? (
                  <span className="text-sm text-[var(--foreground)]/55">Select a work order</span>
                ) : materialItemResolving ? (
                  <span className="text-sm text-[var(--foreground)]/55">Resolving…</span>
                ) : (
                  <span className="truncate text-sm text-[var(--foreground)]">
                    {workOrderItemLabel}
                  </span>
                )}
              </FormField>
            </CellAt>
          </FieldSection>
        </SectionCard>
      ) : null}
    </div>
  )
}
