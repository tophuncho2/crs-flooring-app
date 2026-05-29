"use client"

import {
  formatAdjustmentTransition,
  INVENTORY_ADJUSTMENT_NOTES_MAX,
  isAdjustmentPendingEditable,
} from "@builders/domain"
import { AdjustmentStatusBadge } from "@/components/badges/adjustment-status-badge"
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

export type AdjustmentEditFormFieldsProps = {
  mode: "create" | "edit"
  adjustment: AdjustmentPanelRow | null
  controller: AdjustmentEditPanelController
}

const ADJUSTMENT_TYPE_OPTIONS = [
  { value: "DEDUCTION", label: "Deduction" },
  { value: "INCREASE", label: "Increase" },
] as const

/**
 * The form body of the adjustment edit panel — the editable cells, plus (in
 * edit mode) a read-only summary of the non-editable, non-picker facts. The
 * picker stack (Work order / Material item / Warehouse / Inventory / Location)
 * lives in the panel's sticky header (`AdjustmentPickerStack`), so this body no
 * longer repeats warehouse / inventory / location — they show as locked header
 * pickers.
 *
 * Create mode: type selector (INCREASE / DEDUCTION) + amount + waste + notes.
 * Edit mode: read-only summary (product / status pill / type / timestamps /
 * collapsed before→after "Adjustment" / coverage / final-sequence), then the
 * editable quantity / notes / waste cells (locked once the row leaves the
 * PENDING-editable state).
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
  const coverageUnit = adjustment?.itemCoverageUnitAbbrev ?? ""

  // Locked once the row leaves the PENDING-editable state. Mirrors the server
  // guard so finalized rows can't accept input — the PATCH would 409 anyway.
  const isReadOnly = mode === "edit" && adjustment != null && !isAdjustmentPendingEditable(adjustment)
  const fieldsEditable = !isSaving && !isReadOnly

  return (
    <div className="flex flex-col gap-4">
      {mode === "edit" && adjustment ? (
        <SidePanelPreviewReadonlySection>
          <SidePanelPreviewReadonlyRow label="Product" value={adjustment.productName || EMPTY_CELL} />
          <SidePanelPreviewReadonlyRow
            label="Status"
            value={<AdjustmentStatusBadge status={adjustment.status} />}
          />
          <SidePanelPreviewReadonlyRow
            label="Type"
            value={adjustment.adjustmentType === "INCREASE" ? "Increase" : "Deduction"}
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
            label="Adjustment"
            value={formatAdjustmentTransition(adjustment.before, adjustment.after, stockUnit) ?? EMPTY_CELL}
          />
          <SidePanelPreviewReadonlyRow
            label="Coverage"
            value={formatMeasurement(adjustment.coverage, coverageUnit)}
          />
          <SidePanelPreviewReadonlyRow
            label="Final sequence"
            value={adjustment.finalSequence != null ? String(adjustment.finalSequence) : EMPTY_CELL}
          />
        </SidePanelPreviewReadonlySection>
      ) : null}

      <FieldSection gap="0.75rem">
        {mode === "create" ? (
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
        ) : null}
        <CellAt col={1} colSpan={4}>
          <FormField label="Quantity" required>
            <UnitCell
              editable={fieldsEditable}
              value={form.quantity}
              onChange={(next) => controller.setField("quantity", next)}
              unit={stockUnit}
              placeholder="0"
              ariaLabel="Adjustment quantity"
            />
          </FormField>
        </CellAt>
        <CellAt col={5} colSpan={4}>
          <FormField label="Waste">
            <CheckboxCell
              editable={fieldsEditable}
              value={form.isWaste}
              onChange={(next) => controller.setField("isWaste", next)}
              ariaLabel="Waste flag"
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
      </FieldSection>
    </div>
  )
}
