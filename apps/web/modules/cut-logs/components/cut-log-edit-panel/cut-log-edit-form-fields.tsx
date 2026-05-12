"use client"

import { isCutLogPendingEditable, type InventoryOption } from "@builders/domain"
import { CutLogStatusBadge } from "@/components/badges/cut-log-status-badge"
import { CheckboxCell, TextCell, UnitCell } from "@/components/cells"
import { FieldSection, FormField } from "@/components/fields"
import { CellAt } from "@/components/layout-grid/cell-at"
import { formatCutLogTimestamp } from "@/modules/cut-logs/components/row/format-cut-log-timestamp"
import { InventoryPicker } from "@/modules/inventory/components/picker/inventory-picker"
import type {
  CutLogEditPanelController,
  CutLogPanelRow,
} from "@/modules/cut-logs/controllers/use-cut-log-edit-panel"

export type CutLogEditFormFieldsProps = {
  mode: "create" | "edit"
  cutLog: CutLogPanelRow | null
  controller: CutLogEditPanelController
}

/**
 * The form body of the cut-log edit panel. Uses `FieldSection` (8-col
 * invisible grid) for layout. In edit mode the inventory selector becomes a
 * static display (saved cuts have immutable inventory). In create mode the
 * inventory picker (scoped by parent WO's warehouse + parent WOMI's product)
 * is the only filter — a free-text Location chip narrows the picker's
 * results when needed.
 */
export function CutLogEditFormFields({
  mode,
  cutLog,
  controller,
}: CutLogEditFormFieldsProps) {
  const { form, local, warehouseId, isSaving } = controller

  const inventoryDisplay = cutLog?.inventoryItem ?? "—"

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
    <FieldSection gap="0.75rem">
      {/* Row 1 — status + final sequence (edit mode only). Cut # already
          surfaces as the panel title, so the field there would be a
          duplicate. Final sequence (worker-stamped at finalize) gets the
          slot instead. */}
      {cutLog ? (
        <>
          <CellAt col={1} colSpan={3}>
            <FormField label="Status">
              <div className="flex items-center">
                <CutLogStatusBadge status={cutLog.status} />
              </div>
            </FormField>
          </CellAt>
          <CellAt col={4} colSpan={5}>
            <FormField label="Final sequence">
              <TextCell
                editable={false}
                value={cutLog.finalCutSequence != null ? String(cutLog.finalCutSequence) : "—"}
                ariaLabel="Final sequence"
              />
            </FormField>
          </CellAt>
        </>
      ) : null}

      {/* Row 2 — before / after (read-only, worker-stamped, unit-aware) */}
      <CellAt col={1} colSpan={4}>
        <FormField label="Before">
          <UnitCell editable={false} value={cutLog?.before ?? ""} unit={stockUnit} ariaLabel="Before" />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label="After">
          <UnitCell editable={false} value={cutLog?.after ?? ""} unit={stockUnit} ariaLabel="After" />
        </FormField>
      </CellAt>

      {/* Row 3 — cut + coverage (unit-aware to match row display) */}
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
      <CellAt col={5} colSpan={4}>
        <FormField label="Coverage">
          <UnitCell
            editable={false}
            value={cutLog?.coverageCut ?? ""}
            unit={coverageUnit}
            ariaLabel="Coverage"
          />
        </FormField>
      </CellAt>

      {/* Row 4 — inventory picker (create) or read-only inventory + location
          (edit). Location is a denormalized mirror: stamped from the parent
          inventory on create / update / finalize and cleared on void. It's
          read-only in this panel — operators edit location on the inventory
          record itself; the mirror re-snaps next time the cut log is touched. */}
      {mode === "create" ? (
        <>
          <CellAt col={1} colSpan={8}>
            <FormField label="Location filter">
              <TextCell
                editable={!isSaving}
                value={local.locationFilter}
                onChange={controller.setLocationFilter}
                placeholder="Filter inventory by location"
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
        </>
      ) : (
        <>
          <CellAt col={1} colSpan={8}>
            <FormField label="Inventory">
              <TextCell editable={false} value={inventoryDisplay} ariaLabel="Inventory" />
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={8}>
            <FormField label="Location">
              <TextCell
                editable={false}
                value={cutLog?.location ?? "—"}
                ariaLabel="Location"
              />
            </FormField>
          </CellAt>
          {/* WO + material-item context — server-resolved on the inventory
              side via `InventoryCutLogRow`, hydrated from in-scope WO/WOMI
              state on the work-orders side. Void clears the underlying
              link cols, so both read "—" once a row is voided. */}
          <CellAt col={1} colSpan={8}>
            <FormField label="Work order">
              <TextCell
                editable={false}
                value={cutLog?.workOrderNumber ?? "—"}
                ariaLabel="Work order"
              />
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={8}>
            <FormField label="Material item">
              <TextCell
                editable={false}
                value={cutLog?.workOrderItemProductLabel ?? "—"}
                ariaLabel="Material item"
              />
            </FormField>
          </CellAt>
        </>
      )}

      {/* Row 5 — notes (full width) */}
      <CellAt col={1} colSpan={8}>
        <FormField label="Notes">
          <TextCell
            editable={fieldsEditable}
            value={form.notes}
            onChange={(next) => controller.setField("notes", next)}
            placeholder="Notes"
            ariaLabel="Cut log notes"
          />
        </FormField>
      </CellAt>

      {/* Row 6 — waste flag */}
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

      {/* Row 7 — created / updated timestamps (edit only) */}
      {mode === "edit" && cutLog ? (
        <>
          <CellAt col={1} colSpan={4}>
            <FormField label="Created">
              <TextCell
                editable={false}
                value={formatCutLogTimestamp(cutLog.createdAt)}
                ariaLabel="Created at"
              />
            </FormField>
          </CellAt>
          <CellAt col={5} colSpan={4}>
            <FormField label="Updated">
              <TextCell
                editable={false}
                value={formatCutLogTimestamp(cutLog.updatedAt)}
                ariaLabel="Updated at"
              />
            </FormField>
          </CellAt>
        </>
      ) : null}
    </FieldSection>
  )
}
