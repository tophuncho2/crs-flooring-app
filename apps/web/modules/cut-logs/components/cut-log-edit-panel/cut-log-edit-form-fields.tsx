"use client"

import { isCutLogPendingEditable, type InventoryOption } from "@builders/domain"
import { CutLogStatusBadge } from "@/components/badges/cut-log-status-badge"
import { CheckboxCell, TextCell, UnitCell } from "@/components/cells"
import { FieldSection, FormField } from "@/components/fields"
import { CellAt } from "@/components/layout-grid/cell-at"
import { formatCutLogTimestamp } from "@/modules/cut-logs/components/row/format-cut-log-timestamp"
import { InventoryPicker } from "@/modules/inventory/components/picker/inventory-picker"
import { LocationPicker } from "@/modules/inventory/components/picker/location-picker"
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
    <div className="flex flex-col gap-4 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)]/40 p-3">
      {/* Context — work order #, status, material item (edit only). Cut #
          already surfaces as the panel title; status sits next to the WO. */}
      {cutLog ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/65">
            Context
          </h3>
          <FieldSection gap="0.75rem">
            <CellAt col={1} colSpan={5}>
              <FormField label="Work order">
                <TextCell
                  editable={false}
                  value={cutLog.workOrderNumber ?? "—"}
                  ariaLabel="Work order"
                />
              </FormField>
            </CellAt>
            <CellAt col={6} colSpan={3}>
              <FormField label="Status">
                <div className="flex items-center">
                  <CutLogStatusBadge status={cutLog.status} />
                </div>
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField label="Material item">
                <TextCell
                  editable={false}
                  value={cutLog.workOrderItemProductLabel ?? "—"}
                  ariaLabel="Material item"
                />
              </FormField>
            </CellAt>
          </FieldSection>
        </section>
      ) : null}

      {/* Inventory — picker (create) or read-only inventory + location
          (edit). Location is a denormalized mirror: stamped from the parent
          inventory on create / update / finalize and cleared on void. It's
          read-only in this panel — operators edit location on the inventory
          record itself; the mirror re-snaps next time the cut log is touched. */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/65">
          Inventory
        </h3>
        <FieldSection gap="0.75rem">
          {mode === "create" ? (
            <>
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
            </>
          )}
        </FieldSection>
      </section>

      {/* Cut measurements — before / cut + coverage / after. */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/65">
          Cut measurements
        </h3>
        <FieldSection gap="0.75rem">
          <CellAt col={1} colSpan={4}>
            <FormField label="Before">
              <UnitCell editable={false} value={cutLog?.before ?? ""} unit={stockUnit} ariaLabel="Before" />
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
          <CellAt col={1} colSpan={4}>
            <FormField label="After">
              <UnitCell editable={false} value={cutLog?.after ?? ""} unit={stockUnit} ariaLabel="After" />
            </FormField>
          </CellAt>
        </FieldSection>
      </section>

      {/* Notes & flags — notes (full width), waste flag, final sequence (edit only). */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/65">
          Notes &amp; flags
        </h3>
        <FieldSection gap="0.75rem">
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
          {cutLog ? (
            <CellAt col={5} colSpan={4}>
              <FormField label="Final sequence">
                <TextCell
                  editable={false}
                  value={cutLog.finalCutSequence != null ? String(cutLog.finalCutSequence) : "—"}
                  ariaLabel="Final sequence"
                />
              </FormField>
            </CellAt>
          ) : null}
        </FieldSection>
      </section>

      {/* Timestamps — created / updated (edit only). */}
      {mode === "edit" && cutLog ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/65">
            Timestamps
          </h3>
          <FieldSection gap="0.75rem">
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
          </FieldSection>
        </section>
      ) : null}
    </div>
  )
}
