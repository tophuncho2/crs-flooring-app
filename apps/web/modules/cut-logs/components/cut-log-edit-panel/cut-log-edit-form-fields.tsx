"use client"

import { CUT_LOG_NOTES_MAX, isCutLogPendingEditable, type InventoryOption } from "@builders/domain"
import { CheckboxCell, TextCell, UnitCell } from "@/components/cells"
import { FieldSection, FormField } from "@/components/fields"
import { CellAt } from "@/components/layout-grid/cell-at"
import {
  SidePanelPreviewReadonlyRow,
  SidePanelPreviewReadonlySection,
} from "@/components/side-panel-preview"
import { formatCutLogTimestamp } from "@/modules/cut-logs/components/row/format-cut-log-timestamp"
import { InventoryPicker } from "@/modules/inventory/components/picker/inventory-picker"
import { LocationPicker } from "@/modules/inventory/components/picker/location-picker"
import type {
  CutLogEditPanelController,
  CutLogPanelRow,
} from "@/modules/cut-logs/controllers/use-cut-log-edit-panel"

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
 * The form body of the cut-log edit panel.
 *
 * Edit mode: a bordered read-only summary card (matching the template-sync
 * preview header chrome) over the three editable cells (notes, waste, cut).
 *
 * Create mode: an inventory picker section (location filter + inventory
 * picker, scoped by parent WO's warehouse and parent WOMI's product) over
 * the three editable cells. There is no read-only summary in create mode —
 * the cut log doesn't exist yet, so timestamps / before / after / coverage
 * have nothing to show.
 */
export function CutLogEditFormFields({
  mode,
  cutLog,
  controller,
}: CutLogEditFormFieldsProps) {
  const { form, local, warehouseId, isSaving } = controller

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
  const isReadOnly = mode === "edit" && cutLog != null && !isCutLogPendingEditable(cutLog)
  const fieldsEditable = !isSaving && !isReadOnly

  return (
    <div className="flex flex-col gap-4">
      {mode === "edit" && cutLog ? (
        <SidePanelPreviewReadonlySection>
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
            value={formatMeasurement(cutLog.coverageCut, coverageUnit)}
          />
        </SidePanelPreviewReadonlySection>
      ) : null}

      {mode === "create" ? (
        // Inventory pickers — only path to setting the cut log's inventory.
        // Location is a denormalized mirror: stamped from the parent inventory
        // on create / update / finalize and cleared on void.
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/65">
            Inventory
          </h3>
          <FieldSection gap="0.75rem">
            <CellAt col={1} colSpan={8}>
              <FormField label="Location filter">
                <LocationPicker
                  value={local.locationFilter || null}
                  onChange={controller.setLocationFilter}
                  warehouseId={warehouseId}
                  disabled={isSaving}
                  ariaLabel="Cut log inventory location filter"
                />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField label="Inventory" required>
                <InventoryPicker
                  value={form.inventoryId || null}
                  onChange={controller.setInventoryId}
                  onOptionSelected={(option: InventoryOption | null) =>
                    controller.snapshotInventoryOption(option)
                  }
                  warehouseId={warehouseId}
                  productId={
                    controller.open?.mode === "create"
                      ? controller.open.productId || null
                      : null
                  }
                  location={local.locationFilter || null}
                  selectedLabel={local.pickedInventoryLabel || null}
                  disabled={isSaving}
                  ariaLabel="Cut log inventory"
                />
              </FormField>
            </CellAt>
          </FieldSection>
        </section>
      ) : null}

      {/* Editable cells — notes, waste, cut. Stacked vertically per the panel
          spec; each row uses the 8-col invisible grid for consistent gutters. */}
      <FieldSection gap="0.75rem">
        <CellAt col={1} colSpan={8}>
          <FormField label="Notes">
            <TextCell
              editable={fieldsEditable}
              value={form.notes}
              onChange={(next) => controller.setField("notes", next)}
              placeholder="Notes"
              ariaLabel="Cut log notes"
              maxLength={CUT_LOG_NOTES_MAX}
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
        <CellAt col={1} colSpan={4}>
          <FormField label="Cut" required>
            <UnitCell
              editable={fieldsEditable}
              value={form.cut}
              onChange={(next) => controller.setField("cut", next)}
              unit={stockUnit}
              placeholder="0"
              ariaLabel="Cut amount"
            />
          </FormField>
        </CellAt>
      </FieldSection>
    </div>
  )
}
