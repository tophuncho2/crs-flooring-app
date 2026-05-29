"use client"

import { INVENTORY_ADJUSTMENT_NOTES_MAX, isAdjustmentPendingEditable } from "@builders/domain"
import { CheckboxCell, TextCell, UnitCell } from "@/components/cells"
import { SegmentedDropdown } from "@/components/dropdowns/segmented-dropdown/segmented-dropdown"
import { FieldSection, FormField } from "@/components/fields"
import { CellAt } from "@/components/layout-grid/cell-at"
import {
  SidePanelPreviewReadonlyRow,
  SidePanelPreviewReadonlySection,
} from "@/components/side-panel-preview"
import { formatAdjustmentTimestamp } from "@/modules/adjustments/components/row/format-adjustment-timestamp"
import type {
  AdjustmentEditPanelController,
  AdjustmentPanelRow,
} from "@/modules/adjustments/controllers/adjustment-side-panel"

const EMPTY_CELL = "—"

function formatMeasurement(value: string | null | undefined, unit: string): string {
  if (value === null || value === undefined) return EMPTY_CELL
  const trimmed = value.trim()
  if (trimmed.length === 0) return EMPTY_CELL
  const unitTrim = unit.trim()
  return unitTrim.length > 0 ? `${trimmed} ${unitTrim}` : trimmed
}

function valueOrDash(value: string | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_CELL
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : EMPTY_CELL
}

export type AdjustmentEditFormFieldsProps = {
  mode: "create" | "edit" | "manual-create"
  adjustment: AdjustmentPanelRow | null
  controller: AdjustmentEditPanelController
  /**
   * Stock-unit abbrev for the amount cell in `manual-create` mode. The parent
   * inventory is the hub context (no picker), so the unit can't be derived from
   * a picked option — the hub passes it from the inventory snapshot.
   */
  stockUnit?: string
}

const ADJUSTMENT_TYPE_OPTIONS = [
  { value: "DEDUCTION", label: "Deduction" },
  { value: "INCREASE", label: "Increase" },
] as const

/**
 * The form body of the adjustment edit panel — the cells only. Picker
 * triggers (Location + Inventory in create mode; WO + WOMI in edit) live
 * in the panel's sticky `topToolbar` so they stay visible while the body
 * swaps to a picker takeover (template-sync pattern).
 *
 * Edit mode: a bordered read-only summary card (matching the template-sync
 * preview header chrome) over the three editable cells (cut, notes, waste).
 *
 * Create mode: just the three editable cells — there is no read-only
 * summary because the adjustment doesn't exist yet (no timestamps / before
 * / after / coverage to show).
 */
export function AdjustmentEditFormFields({
  mode,
  adjustment,
  controller,
  stockUnit: stockUnitProp,
}: AdjustmentEditFormFieldsProps) {
  const { form, local, isSaving } = controller

  // Manual create (inventory hub): direction picker + amount + notes. No
  // read-only summary (the row doesn't exist yet), no waste, no pickers —
  // the parent inventory is fixed by the hub context.
  if (mode === "manual-create") {
    const manualUnit = stockUnitProp ?? ""
    return (
      <FieldSection gap="0.75rem">
        <CellAt col={1} colSpan={8}>
          <FormField label="Type" required>
            <SegmentedDropdown
              value={form.adjustmentType}
              onChange={(next) => {
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
        <CellAt col={1} colSpan={4}>
          <FormField label="Amount" required>
            <UnitCell
              editable={!isSaving}
              value={form.quantity}
              onChange={(next) => controller.setField("quantity", next)}
              unit={manualUnit}
              placeholder="0"
              ariaLabel="Adjustment amount"
            />
          </FormField>
        </CellAt>
        <CellAt col={5} colSpan={4}>
          <FormField label="Waste">
            <CheckboxCell
              editable={!isSaving}
              value={form.isWaste}
              onChange={(next) => controller.setField("isWaste", next)}
              ariaLabel="Waste flag"
            />
          </FormField>
        </CellAt>
        <CellAt col={1} colSpan={8}>
          <FormField
            label="Notes"
            currentLength={form.notes.length}
            maxLength={INVENTORY_ADJUSTMENT_NOTES_MAX}
          >
            <TextCell
              editable={!isSaving}
              value={form.notes}
              onChange={(next) => controller.setField("notes", next)}
              placeholder="Notes"
              ariaLabel="Adjustment notes"
              maxLength={INVENTORY_ADJUSTMENT_NOTES_MAX}
            />
          </FormField>
        </CellAt>
      </FieldSection>
    )
  }

  // Stock unit source:
  //   - edit mode: the adjustment's frozen `stockUnitAbbrev` snapshot (stamped
  //     from the inventory at create time, never mutated afterward)
  //   - create mode: derived from the currently-picked inventory option's
  //     `stockUnitAbbrev` snapshot kept in `local` — what the adjustment will
  //     inherit on save
  const stockUnit = adjustment?.stockUnitAbbrev ?? local.pickedInventoryStockUnitAbbrev
  const coverageUnit = adjustment?.itemCoverageUnitAbbrev ?? ""

  // Locked once the row leaves the PENDING-editable state. Mirrors the server
  // guard (assertAdjustmentPendingMutationAllowed) so finalized/voided rows can't
  // accept input — the PATCH route would 409 anyway.
  const isReadOnly = mode === "edit" && adjustment != null && !isAdjustmentPendingEditable(adjustment)
  const fieldsEditable = !isSaving && !isReadOnly

  return (
    <div className="flex flex-col gap-4">
      {mode === "edit" && adjustment ? (
        <SidePanelPreviewReadonlySection>
          <SidePanelPreviewReadonlyRow
            label="Warehouse"
            value={valueOrDash(adjustment.warehouseName)}
          />
          <SidePanelPreviewReadonlyRow
            label="Product"
            value={valueOrDash(adjustment.productName)}
          />
          <SidePanelPreviewReadonlyRow
            label="Created"
            value={formatAdjustmentTimestamp(adjustment.createdAt)}
          />
          <SidePanelPreviewReadonlyRow
            label="Updated"
            value={formatAdjustmentTimestamp(adjustment.updatedAt)}
          />
          <SidePanelPreviewReadonlyRow
            label="Inventory item"
            value={valueOrDash(adjustment.inventoryItem)}
          />
          <SidePanelPreviewReadonlyRow
            label="Location"
            value={valueOrDash(adjustment.location)}
          />
          <SidePanelPreviewReadonlyRow
            label="Before"
            value={formatMeasurement(adjustment.before, stockUnit)}
          />
          <SidePanelPreviewReadonlyRow
            label="After"
            value={formatMeasurement(adjustment.after, stockUnit)}
          />
          <SidePanelPreviewReadonlyRow
            label="Coverage"
            value={formatMeasurement(adjustment.coverage, coverageUnit)}
          />
        </SidePanelPreviewReadonlySection>
      ) : null}

      {/* Editable cells — notes, waste, cut. Stacked vertically per the panel
          spec; each row uses the 8-col invisible grid for consistent gutters. */}
      <FieldSection gap="0.75rem">
        <CellAt col={1} colSpan={4}>
          <FormField label="Cut" required>
            <UnitCell
              editable={fieldsEditable}
              value={form.quantity}
              onChange={(next) => controller.setField("quantity", next)}
              unit={stockUnit}
              placeholder="0"
              ariaLabel="Cut amount"
            />
          </FormField>
        </CellAt>
        <CellAt col={1} colSpan={8}>
          <FormField
            label="Notes"
            currentLength={fieldsEditable ? form.notes.length : undefined}
            maxLength={INVENTORY_ADJUSTMENT_NOTES_MAX}
          >
            <TextCell
              editable={fieldsEditable}
              value={form.notes}
              onChange={(next) => controller.setField("notes", next)}
              placeholder="Notes"
              ariaLabel="Adjustment notes"
              maxLength={INVENTORY_ADJUSTMENT_NOTES_MAX}
            />
          </FormField>
        </CellAt>
        <CellAt col={1} colSpan={4}>
          <FormField label="Waste">
            <CheckboxCell
              editable={fieldsEditable}
              value={form.isWaste}
              onChange={(next) => controller.setField("isWaste", next)}
              ariaLabel="Waste flag"
            />
          </FormField>
        </CellAt>
      </FieldSection>
    </div>
  )
}
