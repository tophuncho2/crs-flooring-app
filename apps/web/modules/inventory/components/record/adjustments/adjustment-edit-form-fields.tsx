"use client"

import {
  formatAdjustmentTransition,
  INVENTORY_ADJUSTMENT_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
} from "@builders/domain"
import {
  CellAt,
  FormField,
  SegmentedChoiceCell,
  StaticFieldValue,
  TextCell,
  UnitCell,
  type SegmentedChoiceOption,
} from "@/engines/record-view"
import { SegmentedDropdown } from "@/engines/picker"
import { formatAdjustmentTimestamp } from "@/modules/adjustments/components/row/format-adjustment-timestamp"
import type { AdjustmentEditController } from "../../../controllers/record/adjustments/use-adjustment-edit-controller"
import type { AdjustmentEditRow } from "../../../controllers/record/adjustments/types"

const EMPTY_CELL = "—"

export type AdjustmentEditFormFieldsProps = {
  mode: "create" | "edit"
  adjustment: AdjustmentEditRow | null
  controller: AdjustmentEditController
}

const ADJUSTMENT_TYPE_OPTIONS = [
  { value: "DEDUCTION", label: "Deduction" },
  { value: "INCREASE", label: "Increase" },
] as const

const WASTE_OPTIONS: ReadonlyArray<SegmentedChoiceOption> = [
  { value: "WASTE", label: "Waste", tone: "warning" },
  { value: "NON_WASTE", label: "Non-waste", tone: "default" },
]

/**
 * The adjustment's own facts, rendered as bare `<CellAt>` cells for the shared
 * record-view field grid supplied by the host (`EmbeddedAdjustmentRecordView`) —
 * no group chrome. The work-order cells live in `AdjustmentPickerStack`, ahead of
 * these in the same grid.
 *
 * Single full-width stack in both modes: Location, Quantity, Type. Create stops
 * there with Notes then Waste; edit inserts the before→after Adjustment transition
 * under Type, then Notes / Waste, then the Created / Updated timestamps, and
 * unlocks Location. Every field is freely editable (only disabled mid-save);
 * flipping the type re-flows the before→after transition server-side on each save.
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

  const wasteCell = (
    <CellAt col={1} colSpan={4}>
      <FormField label="Waste">
        <SegmentedChoiceCell
          editable={editable}
          value={form.isWaste ? "WASTE" : "NON_WASTE"}
          options={WASTE_OPTIONS}
          ariaLabel="Waste flag"
          onChange={(next) => controller.setField("isWaste", next === "WASTE")}
        />
      </FormField>
    </CellAt>
  )

  const typeCell = (
    <CellAt col={1} colSpan={4}>
      <FormField label="Type">
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
      </FormField>
    </CellAt>
  )

  const quantityCell = (
    <CellAt col={1} colSpan={4}>
      <FormField label="Quantity" required>
        <UnitCell
          editable={editable}
          value={form.quantity}
          onChange={(next) => controller.setField("quantity", next)}
          unit={stockUnit}
          placeholder="0"
          ariaLabel="Adjustment quantity"
        />
      </FormField>
    </CellAt>
  )

  const notesCell = (
    <CellAt col={1} colSpan={4}>
      <FormField
        label="Notes"
        currentLength={editable ? form.notes.length : undefined}
        maxLength={editable ? INVENTORY_ADJUSTMENT_NOTES_MAX : undefined}
      >
        <TextCell
          editable={editable}
          value={form.notes}
          onChange={(next) => controller.setField("notes", next)}
          placeholder="Notes"
          ariaLabel="Adjustment notes"
          maxLength={INVENTORY_ADJUSTMENT_NOTES_MAX}
        />
      </FormField>
    </CellAt>
  )

  if (mode === "create" || !adjustment) {
    return (
      <>
        {/* Seeded from the parent inventory's location and locked during create.
            Becomes editable once the row exists (edit branch below). */}
        <CellAt col={1} colSpan={4}>
          <FormField label="Location">
            <TextCell
              editable={false}
              value={form.location}
              placeholder="Location"
              ariaLabel="Adjustment location"
              maxLength={INVENTORY_LOCATION_MAX}
            />
          </FormField>
        </CellAt>
        {quantityCell}
        {typeCell}
        {notesCell}
        {wasteCell}
      </>
    )
  }

  const transition = formatAdjustmentTransition(adjustment.before, adjustment.after, stockUnit) ?? EMPTY_CELL

  return (
    <>
      <CellAt col={1} colSpan={4}>
        <FormField
          label="Location"
          currentLength={editable ? form.location.length : undefined}
          maxLength={editable ? INVENTORY_LOCATION_MAX : undefined}
        >
          <TextCell
            editable={editable}
            value={form.location}
            onChange={(next) => controller.setField("location", next)}
            placeholder="Location"
            ariaLabel="Adjustment location"
            maxLength={INVENTORY_LOCATION_MAX}
          />
        </FormField>
      </CellAt>
      {quantityCell}
      {typeCell}
      <CellAt col={1} colSpan={4}>
        <FormField label="Adjustment">
          <StaticFieldValue className="tabular-nums">{transition}</StaticFieldValue>
        </FormField>
      </CellAt>
      {notesCell}
      {wasteCell}
      <CellAt col={1} colSpan={4}>
        <FormField label="Created">
          <StaticFieldValue>{formatAdjustmentTimestamp(adjustment.createdAt)}</StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="Updated">
          <StaticFieldValue>{formatAdjustmentTimestamp(adjustment.updatedAt)}</StaticFieldValue>
        </FormField>
      </CellAt>
    </>
  )
}
