"use client"

import {
  formatAdjustmentTransition,
  INVENTORY_ADJUSTMENT_AREA_MAX,
  INVENTORY_ADJUSTMENT_INTERNAL_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
} from "@builders/domain"
import {
  CellAt,
  FormField,
  RecordColumnBreak,
  RecordSectionDivider,
  SegmentedChoiceCell,
  StatCell,
  StaticFieldValue,
  TextareaCell,
  TextCell,
  UnitCell,
  type SegmentedChoiceOption,
} from "@/engines/record-view"
import { SegmentedDropdown } from "@/engines/picker"
import { CellChip, PaletteColorDropdown } from "@/engines/common"
import { formatAdjustmentTimestamp } from "@/modules/adjustments/components/row/format-adjustment-timestamp"
import { AdjustmentPickerStack } from "./adjustment-picker-stack"
import { InventoryFieldGrid, WarehouseStaticField } from "../fields"
import type { AdjustmentEditController } from "../../../controllers/record/adjustments/use-adjustment-edit-controller"
import type { AdjustmentEditRow } from "../../../controllers/record/adjustments/types"

const EMPTY_CELL = "—"

export type AdjustmentEditFormFieldsProps = {
  mode: "create" | "edit"
  adjustment: AdjustmentEditRow | null
  controller: AdjustmentEditController
}

const ADJUSTMENT_TYPE_OPTIONS = [
  { value: "DEDUCTION", label: "Deduction", tone: "error" },
  { value: "INCREASE", label: "Increase", tone: "success" },
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
 * a centered `RecordColumnBreak` above a `RecordSectionDivider` and a half-width
 * Created | Updated footer. Left flank pairs Quantity | Type and Location |
 * Warehouse (the source inventory's warehouse, read-only), then the before→after
 * Adjustment transition with Adjustment # | Color seated below it; right flank =
 * Work order / Notes / Waste.
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

  // Stock-unit abbrev, FK-derived at read time (off `unitId`): edit → the row's
  // resolved abbrev; create → the picked inventory's abbrev kept in `local`
  // (seeded for the locked hub case).
  const stockUnit = adjustment?.stockUnitAbbrev ?? local.pickedInventoryStockUnitAbbrev

  // Every field is freely editable now — there is no finalize/freeze. Cells are
  // only disabled while a save is in flight.
  const editable = !isSaving

  // Inner field nodes (no positioning) — shared so create can stack them
  // half-width and edit can pair / re-span them per flank.
  const wasteField = (
    <FormField label="Waste">
      <SegmentedChoiceCell
        editable={editable}
        value={form.isWaste ? "WASTE" : "NON_WASTE"}
        options={WASTE_OPTIONS}
        ariaLabel="Waste flag"
        onChange={(next) => controller.setField("isWaste", next === "WASTE")}
      />
    </FormField>
  )

  const typeField = (
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
  )

  const colorField = (
    <FormField label="Color">
      <PaletteColorDropdown
        value={form.color}
        editable={editable}
        onChange={(color) => controller.setField("color", color)}
        ariaLabel="Adjustment color"
      />
    </FormField>
  )

  const quantityField = (
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
  )

  const internalNotesField = (
    <FormField
      label="Internal Notes"
      currentLength={editable ? form.internalNotes.length : undefined}
      maxLength={editable ? INVENTORY_ADJUSTMENT_INTERNAL_NOTES_MAX : undefined}
    >
      <TextareaCell
        editable={editable}
        value={form.internalNotes}
        onChange={(next) => controller.setField("internalNotes", next)}
        placeholder="Internal notes"
        ariaLabel="Adjustment internal notes"
        maxLength={INVENTORY_ADJUSTMENT_INTERNAL_NOTES_MAX}
        rows={1}
      />
    </FormField>
  )

  // User-owned free text — editable in create + edit, never seeded from parent.
  const areaField = (
    <FormField
      label="Area"
      currentLength={editable ? form.area.length : undefined}
      maxLength={editable ? INVENTORY_ADJUSTMENT_AREA_MAX : undefined}
    >
      <TextCell
        editable={editable}
        value={form.area}
        onChange={(next) => controller.setField("area", next)}
        placeholder="Area"
        ariaLabel="Adjustment area"
        maxLength={INVENTORY_ADJUSTMENT_AREA_MAX}
      />
    </FormField>
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
        <CellAt col={1} colSpan={4}>{areaField}</CellAt>
        <CellAt col={1} colSpan={4}>{quantityField}</CellAt>
        <CellAt col={1} colSpan={4}>{typeField}</CellAt>
        <CellAt col={1} colSpan={4}>{colorField}</CellAt>
        <CellAt col={1} colSpan={4}>{internalNotesField}</CellAt>
        <CellAt col={1} colSpan={4}>{wasteField}</CellAt>
      </>
    )
  }

  const transition = formatAdjustmentTransition(adjustment.before, adjustment.after, stockUnit) ?? EMPTY_CELL

  return (
    <div className="flex flex-col gap-4">
      <RecordColumnBreak
        left={
          <InventoryFieldGrid>
            {/* Adjustment # | Color lead the flank, then the work-order picker,
                area, and internal notes stacked full-width beneath. */}
            <CellAt col={1} colSpan={4}>
              <FormField label="Adjustment #">
                <CellChip paletteColor={form.color}>{adjustment.adjustmentNumber}</CellChip>
              </FormField>
            </CellAt>
            <CellAt col={5} colSpan={4}>{colorField}</CellAt>
            <AdjustmentPickerStack controller={controller} colSpan={8} />
            <CellAt col={1} colSpan={8}>{areaField}</CellAt>
            <CellAt col={1} colSpan={8}>{internalNotesField}</CellAt>
          </InventoryFieldGrid>
        }
        right={
          <InventoryFieldGrid>
            {/* The before→after transition StatCell sits atop the quantity / type
                it reflects; Location | Warehouse and the Waste toggle stack below. */}
            <CellAt col={1} colSpan={8}>
              <FormField label="Adjustment">
                <StatCell display={transition} ariaLabel="Adjustment transition" />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={4}>{quantityField}</CellAt>
            <CellAt col={5} colSpan={4}>{typeField}</CellAt>
            {/* Location (editable) beside the read-only source Warehouse */}
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
            <CellAt col={5} colSpan={4}>
              <WarehouseStaticField warehouseName={adjustment.warehouseName ?? null} />
            </CellAt>
            <CellAt col={1} colSpan={8}>{wasteField}</CellAt>
          </InventoryFieldGrid>
        }
      />

      <RecordSectionDivider />

      {/* Created | Updated each widened to a half-width grid cell (+1 col), with
          the actor (Created by | Updated by) email seated directly beneath —
          mirroring the list columns. */}
      <InventoryFieldGrid>
        <CellAt col={1} colSpan={4}>
          <FormField label="Created">
            <StaticFieldValue>{formatAdjustmentTimestamp(adjustment.createdAt)}</StaticFieldValue>
          </FormField>
        </CellAt>
        <CellAt col={5} colSpan={4}>
          <FormField label="Updated">
            <StaticFieldValue>{formatAdjustmentTimestamp(adjustment.updatedAt)}</StaticFieldValue>
          </FormField>
        </CellAt>
        <CellAt col={1} colSpan={4}>
          <FormField label="Created by">
            <StaticFieldValue>{adjustment.createdBy ?? EMPTY_CELL}</StaticFieldValue>
          </FormField>
        </CellAt>
        <CellAt col={5} colSpan={4}>
          <FormField label="Updated by">
            <StaticFieldValue>{adjustment.updatedBy ?? EMPTY_CELL}</StaticFieldValue>
          </FormField>
        </CellAt>
      </InventoryFieldGrid>
    </div>
  )
}
