"use client"

import {
  formatAdjustmentTransition,
  INVENTORY_ADJUSTMENT_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
} from "@builders/domain"
import { StatusBadge } from "@/engines/common"
import { TextCell, ToggleCell, UnitCell } from "@/engines/record-view"
import { SegmentedDropdown } from "@/engines/picker"
import { StaticFieldValue } from "@/engines/record-view"
import { formatAdjustmentTimestamp } from "@/modules/adjustments/components/row/format-adjustment-timestamp"
import { InventoryField } from "../primary/groups/inventory-field"
import { InventoryGroup } from "../primary/groups/inventory-group"
import type { AdjustmentEditController } from "../../../controllers/record/adjustments/use-adjustment-edit-controller"
import type { AdjustmentEditRow } from "../../../controllers/record/adjustments/types"

const EMPTY_CELL = "—"

const STATUS_LABEL_CLASS = "text-[10px] font-semibold uppercase tracking-wide text-[var(--foreground)]/55"

export type AdjustmentEditFormFieldsProps = {
  mode: "create" | "edit"
  adjustment: AdjustmentEditRow | null
  controller: AdjustmentEditController
}

const ADJUSTMENT_TYPE_OPTIONS = [
  { value: "DEDUCTION", label: "Deduction" },
  { value: "INCREASE", label: "Increase" },
] as const

/**
 * The form body of the adjustment edit panel, rendered as an {@link InventoryGroup}
 * so it shares the record view's tab chrome with the inventory section above. The
 * picker stack (Work order / Material item) lives in its own group
 * (`AdjustmentPickerStack`), so this body holds only the adjustment's own facts.
 *
 * Create mode: a "New adjustment" group — type selector, quantity, notes, with a
 * waste lever in the group header.
 * Edit mode: an "Adjustment" group whose header carries the type pill
 * (Increase/Deduction) and the waste lever. The body shows quantity, then the
 * before→after transition + location, then notes, then created / updated. Every
 * field is always editable (only disabled mid-save); the before→after transition
 * re-flows server-side on each save.
 */
export function AdjustmentEditFormFields({
  mode,
  adjustment,
  controller,
}: AdjustmentEditFormFieldsProps) {
  const { form, local, isSaving } = controller

  // Stock-unit source: edit → the row's frozen snapshot; create → the picked
  // inventory's snapshot kept in `local` (seeded for the locked hub case).
  const stockUnit = adjustment?.stockUnitAbbrev ?? local.pickedInventoryStockUnitAbbrev

  // Every field is freely editable now — there is no finalize/freeze. Cells are
  // only disabled while a save is in flight.
  const editable = !isSaving

  const wasteToggle = (
    <span className="flex items-center gap-1.5">
      <span className={STATUS_LABEL_CLASS}>Waste</span>
      <ToggleCell
        editable={editable}
        value={form.isWaste}
        onChange={(next) => controller.setField("isWaste", next)}
        ariaLabel="Waste flag"
      />
    </span>
  )

  if (mode === "create" || !adjustment) {
    return (
      <InventoryGroup title="New adjustment" tone="blue" headerRight={wasteToggle}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <InventoryField label="Type" className="col-span-2">
            <SegmentedDropdown
              value={form.adjustmentType}
              onChange={(next: string | null) => {
                if (next === "INCREASE" || next === "DEDUCTION") {
                  controller.setField("adjustmentType", next)
                }
              }}
              options={ADJUSTMENT_TYPE_OPTIONS}
              ariaLabel="Adjustment type"
              disabled={isSaving}
            />
          </InventoryField>
          <InventoryField label="Quantity" required>
            <UnitCell
              editable={editable}
              value={form.quantity}
              onChange={(next) => controller.setField("quantity", next)}
              unit={stockUnit}
              placeholder="0"
              ariaLabel="Adjustment quantity"
            />
          </InventoryField>
          <InventoryField
            label="Location"
            editable={editable}
            currentLength={editable ? form.location.length : undefined}
            maxLength={INVENTORY_LOCATION_MAX}
          >
            <TextCell
              editable={editable}
              value={form.location}
              onChange={(next) => controller.setField("location", next)}
              placeholder="Location"
              ariaLabel="Adjustment location"
              maxLength={INVENTORY_LOCATION_MAX}
            />
          </InventoryField>
          <InventoryField
            label="Notes"
            className="col-span-2"
            editable={editable}
            currentLength={editable ? form.notes.length : undefined}
            maxLength={INVENTORY_ADJUSTMENT_NOTES_MAX}
          >
            <TextCell
              editable={editable}
              value={form.notes}
              onChange={(next) => controller.setField("notes", next)}
              placeholder="Notes"
              ariaLabel="Adjustment notes"
              maxLength={INVENTORY_ADJUSTMENT_NOTES_MAX}
            />
          </InventoryField>
        </div>
      </InventoryGroup>
    )
  }

  const transition = formatAdjustmentTransition(adjustment.before, adjustment.after, stockUnit) ?? EMPTY_CELL

  return (
    <InventoryGroup
      title="Adjustment"
      tone="blue"
      headerRight={
        <div className="flex items-center gap-2">
          <StatusBadge
            size="md"
            tone={adjustment.adjustmentType === "INCREASE" ? "success" : "error"}
          >
            {adjustment.adjustmentType === "INCREASE" ? "Increase" : "Deduction"}
          </StatusBadge>
          <span className="ml-1">{wasteToggle}</span>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <InventoryField label="Quantity" required>
          <UnitCell
            editable={editable}
            value={form.quantity}
            onChange={(next) => controller.setField("quantity", next)}
            unit={stockUnit}
            placeholder="0"
            ariaLabel="Adjustment quantity"
          />
        </InventoryField>
        <InventoryField label="Adjustment">
          <StaticFieldValue className="tabular-nums">{transition}</StaticFieldValue>
        </InventoryField>
        <InventoryField
          label="Location"
          editable={editable}
          currentLength={editable ? form.location.length : undefined}
          maxLength={INVENTORY_LOCATION_MAX}
        >
          <TextCell
            editable={editable}
            value={form.location}
            onChange={(next) => controller.setField("location", next)}
            placeholder="Location"
            ariaLabel="Adjustment location"
            maxLength={INVENTORY_LOCATION_MAX}
          />
        </InventoryField>
        <InventoryField
          label="Notes"
          className="col-span-2"
          editable={editable}
          currentLength={editable ? form.notes.length : undefined}
          maxLength={INVENTORY_ADJUSTMENT_NOTES_MAX}
        >
          <TextCell
            editable={editable}
            value={form.notes}
            onChange={(next) => controller.setField("notes", next)}
            placeholder="Notes"
            ariaLabel="Adjustment notes"
            maxLength={INVENTORY_ADJUSTMENT_NOTES_MAX}
          />
        </InventoryField>
        <InventoryField label="Created">
          <StaticFieldValue>{formatAdjustmentTimestamp(adjustment.createdAt)}</StaticFieldValue>
        </InventoryField>
        <InventoryField label="Updated">
          <StaticFieldValue>{formatAdjustmentTimestamp(adjustment.updatedAt)}</StaticFieldValue>
        </InventoryField>
      </div>
    </InventoryGroup>
  )
}
