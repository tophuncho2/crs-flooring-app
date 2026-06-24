"use client"

import {
  formatAdjustmentTransition,
  INVENTORY_ADJUSTMENT_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
} from "@builders/domain"
import {
  CellAt,
  FormField,
  RecordColumnBreak,
  RecordSectionDivider,
  SegmentedChoiceCell,
  StaticFieldValue,
  TextCell,
  UnitCell,
  type SegmentedChoiceOption,
} from "@/engines/record-view"
import { SegmentedDropdown } from "@/engines/picker"
import { CellChip, PaletteColorDropdown } from "@/engines/common"
import { formatAdjustmentTimestamp } from "@/modules/adjustments/components/row/format-adjustment-timestamp"
import { AdjustmentPickerStack } from "./adjustment-picker-stack"
import { InventoryFieldGrid } from "../fields"
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
 * The adjustment's own facts.
 *
 * **create** (modals) — bare `<CellAt>` cells for the host's single
 * `InventoryFieldGrid` (the work-order cell sits ahead of these via
 * `AdjustmentPickerStack`): Location, Quantity, Type, Color, Notes, Waste, each a
 * half-width (`colSpan={4}`) stacked cell.
 *
 * **edit** (the embedded record-view face) — this component owns the full layout:
 * a centered `RecordColumnBreak` (left flank = Work order / Adjustment # /
 * Location / Notes / Waste; right flank = Quantity / Type / Color / the before→
 * after Adjustment transition) above a `RecordSectionDivider` and a Created /
 * Updated footer. Flank cells fill their flank (`colSpan={8}`).
 *
 * Every field is freely editable (only disabled mid-save); flipping the type
 * re-flows the before→after transition server-side on each save.
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

  // Create stacks half-width cells in the host's 8-col grid; edit fills each
  // RecordColumnBreak flank (its own 8-col grid).
  const span = mode === "edit" ? 8 : 4

  const wasteCell = (
    <CellAt col={1} colSpan={span}>
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
    <CellAt col={1} colSpan={span}>
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

  const colorCell = (
    <CellAt col={1} colSpan={span}>
      <FormField label="Color">
        <PaletteColorDropdown
          value={form.color}
          editable={editable}
          onChange={(color) => controller.setField("color", color)}
          ariaLabel="Adjustment color"
        />
      </FormField>
    </CellAt>
  )

  const quantityCell = (
    <CellAt col={1} colSpan={span}>
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
    <CellAt col={1} colSpan={span}>
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
        <CellAt col={1} colSpan={span}>
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
        {colorCell}
        {notesCell}
        {wasteCell}
      </>
    )
  }

  const transition = formatAdjustmentTransition(adjustment.before, adjustment.after, stockUnit) ?? EMPTY_CELL

  return (
    <div className="flex flex-col gap-4">
      <RecordColumnBreak
        left={
          <InventoryFieldGrid>
            <AdjustmentPickerStack controller={controller} colSpan={span} />
            <CellAt col={1} colSpan={span}>
              <FormField label="Adjustment #">
                <CellChip paletteColor={form.color}>{adjustment.adjustmentNumber}</CellChip>
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={span}>
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
            {notesCell}
            {wasteCell}
          </InventoryFieldGrid>
        }
        right={
          <InventoryFieldGrid>
            {quantityCell}
            {typeCell}
            {colorCell}
            <CellAt col={1} colSpan={span}>
              <FormField label="Adjustment">
                <StaticFieldValue className="tabular-nums">{transition}</StaticFieldValue>
              </FormField>
            </CellAt>
          </InventoryFieldGrid>
        }
      />

      <RecordSectionDivider />

      <div className="flex gap-6">
        <FormField label="Created">
          <StaticFieldValue>{formatAdjustmentTimestamp(adjustment.createdAt)}</StaticFieldValue>
        </FormField>
        <FormField label="Updated">
          <StaticFieldValue>{formatAdjustmentTimestamp(adjustment.updatedAt)}</StaticFieldValue>
        </FormField>
      </div>
    </div>
  )
}
