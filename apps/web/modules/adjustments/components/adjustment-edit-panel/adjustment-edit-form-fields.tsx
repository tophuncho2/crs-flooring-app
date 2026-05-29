"use client"

import { INVENTORY_ADJUSTMENT_NOTES_MAX, isAdjustmentPendingEditable } from "@builders/domain"
import { CheckboxCell, TextCell, UnitCell } from "@/components/cells"
import { FieldSection, FormField } from "@/components/fields"
import { CellAt } from "@/components/layout-grid/cell-at"
import {
  SidePanelPreviewReadonlyRow,
  SidePanelPreviewReadonlySection,
} from "@/components/side-panel-preview"
import { formatCutLogTimestamp } from "@/modules/cut-logs/components/row/format-cut-log-timestamp"
import type {
  CutLogEditPanelController,
  CutLogPanelRow,
} from "@/modules/cut-logs/controllers/cut-log-side-panel"

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

export type CutLogEditFormFieldsProps = {
  mode: "create" | "edit"
  cutLog: CutLogPanelRow | null
  controller: CutLogEditPanelController
}

/**
 * The form body of the cut-log edit panel — the cells only. Picker
 * triggers (Location + Inventory in create mode; WO + WOMI in edit) live
 * in the panel's sticky `topToolbar` so they stay visible while the body
 * swaps to a picker takeover (template-sync pattern).
 *
 * Edit mode: a bordered read-only summary card (matching the template-sync
 * preview header chrome) over the three editable cells (cut, notes, waste).
 *
 * Create mode: just the three editable cells — there is no read-only
 * summary because the cut log doesn't exist yet (no timestamps / before
 * / after / coverage to show).
 */
export function CutLogEditFormFields({
  mode,
  cutLog,
  controller,
}: CutLogEditFormFieldsProps) {
  const { form, local, isSaving } = controller

  // Stock unit source:
  //   - edit mode: the cut log's frozen `stockUnitAbbrev` snapshot (stamped
  //     from the inventory at create time, never mutated afterward)
  //   - create mode: derived from the currently-picked inventory option's
  //     `stockUnitAbbrev` snapshot kept in `local` — what the cut log will
  //     inherit on save
  const stockUnit = cutLog?.stockUnitAbbrev ?? local.pickedInventoryStockUnitAbbrev
  const coverageUnit = cutLog?.itemCoverageUnitAbbrev ?? ""

  // Locked once the row leaves the PENDING-editable state. Mirrors the server
  // guard (assertCutLogPendingMutationAllowed) so finalized/voided rows can't
  // accept input — the PATCH route would 409 anyway.
  const isReadOnly = mode === "edit" && cutLog != null && !isAdjustmentPendingEditable(cutLog)
  const fieldsEditable = !isSaving && !isReadOnly

  return (
    <div className="flex flex-col gap-4">
      {mode === "edit" && cutLog ? (
        <SidePanelPreviewReadonlySection>
          <SidePanelPreviewReadonlyRow
            label="Warehouse"
            value={valueOrDash(cutLog.warehouseName)}
          />
          <SidePanelPreviewReadonlyRow
            label="Product"
            value={valueOrDash(cutLog.productName)}
          />
          <SidePanelPreviewReadonlyRow
            label="Created"
            value={formatCutLogTimestamp(cutLog.createdAt)}
          />
          <SidePanelPreviewReadonlyRow
            label="Updated"
            value={formatCutLogTimestamp(cutLog.updatedAt)}
          />
          <SidePanelPreviewReadonlyRow
            label="Inventory item"
            value={valueOrDash(cutLog.inventoryItem)}
          />
          <SidePanelPreviewReadonlyRow
            label="Location"
            value={valueOrDash(cutLog.location)}
          />
          <SidePanelPreviewReadonlyRow
            label="Before"
            value={formatMeasurement(cutLog.before, stockUnit)}
          />
          <SidePanelPreviewReadonlyRow
            label="After"
            value={formatMeasurement(cutLog.after, stockUnit)}
          />
          <SidePanelPreviewReadonlyRow
            label="Coverage"
            value={formatMeasurement(cutLog.coverage, coverageUnit)}
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
              ariaLabel="Cut log notes"
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
