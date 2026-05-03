"use client"

import { CutLogStatusBadge } from "@/components/badges/cut-log-status-badge"
import { CheckboxCell, TextCell, UnitCell } from "@/components/cells"
import { formatCutLogTimestamp } from "@/components/features/cut-log-row"
import { FieldSection, FormField } from "@/components/fields"
import { CellAt } from "@/components/layout-grid"
import { SidePanel } from "@/components/nav/side-panel"
import type { InventoryCutLogViewPanelController } from "@/modules/inventory/controllers/use-inventory-cut-log-view-panel"

export type InventoryCutLogViewPanelProps = {
  controller: InventoryCutLogViewPanelController
  /** Stock unit fallback for rows that predate the unit snapshot. */
  stockUnitFallback: string
  /** Coverage unit fallback for rows that predate the unit snapshot. */
  coverageUnitFallback: string
}

/**
 * Right-anchored side panel showing all fields of a single inventory cut
 * log read-only. Mirrors the work-orders cut-log edit panel layout but with
 * no edit affordances — cut-log mutations are only available from the WO
 * record view. Carries the panel-only fields the row grid intentionally
 * drops: work order, material item, created, updated.
 */
export function InventoryCutLogViewPanel({
  controller,
  stockUnitFallback,
  coverageUnitFallback,
}: InventoryCutLogViewPanelProps) {
  const { open, close } = controller
  const cutLog = open?.cutLog ?? null
  const stockUnit = cutLog?.stockUnitAbbrev ?? stockUnitFallback
  const coverageUnit = cutLog?.itemCoverageUnitAbbrev ?? coverageUnitFallback

  return (
    <SidePanel
      open={cutLog !== null}
      side="right"
      onClose={close}
      title={cutLog?.cutLogNumber ?? "Cut log"}
      widthClassName="w-[28rem]"
    >
      {cutLog ? (
        <div className="px-4 py-4">
          <FieldSection gap="0.75rem">
            <CellAt col={1} colSpan={2}>
              <FormField label="Status">
                <div className="flex items-center">
                  <CutLogStatusBadge status={cutLog.status} />
                </div>
              </FormField>
            </CellAt>
            <CellAt col={3} colSpan={3}>
              <FormField label="Cut number">
                <TextCell editable={false} value={cutLog.cutLogNumber} ariaLabel="Cut number" />
              </FormField>
            </CellAt>
            <CellAt col={6} colSpan={3}>
              <FormField label="Final sequence">
                <TextCell
                  editable={false}
                  value={cutLog.finalCutSequence != null ? String(cutLog.finalCutSequence) : "—"}
                  ariaLabel="Final sequence"
                />
              </FormField>
            </CellAt>

            <CellAt col={1} colSpan={4}>
              <FormField label="Cut">
                <UnitCell editable={false} value={cutLog.cut} unit={stockUnit} ariaLabel="Cut" />
              </FormField>
            </CellAt>
            <CellAt col={5} colSpan={4}>
              <FormField label="Coverage">
                <UnitCell
                  editable={false}
                  value={cutLog.coverageCut ?? ""}
                  unit={coverageUnit}
                  ariaLabel="Coverage"
                />
              </FormField>
            </CellAt>

            <CellAt col={1} colSpan={3}>
              <FormField label="Before">
                <UnitCell
                  editable={false}
                  value={cutLog.before ?? ""}
                  unit={stockUnit}
                  ariaLabel="Before"
                />
              </FormField>
            </CellAt>
            <CellAt col={4} colSpan={3}>
              <FormField label="After">
                <UnitCell
                  editable={false}
                  value={cutLog.after ?? ""}
                  unit={stockUnit}
                  ariaLabel="After"
                />
              </FormField>
            </CellAt>
            <CellAt col={7} colSpan={2}>
              <FormField label="Waste">
                <CheckboxCell editable={false} value={cutLog.isWaste} ariaLabel="Waste" />
              </FormField>
            </CellAt>

            <CellAt col={1} colSpan={8}>
              <FormField label="Notes">
                <TextCell editable={false} value={cutLog.notes || "—"} ariaLabel="Notes" />
              </FormField>
            </CellAt>

            <CellAt col={1} colSpan={4}>
              <FormField label="Work order">
                <TextCell
                  editable={false}
                  value={cutLog.workOrderId ?? "—"}
                  ariaLabel="Work order"
                />
              </FormField>
            </CellAt>
            <CellAt col={5} colSpan={4}>
              <FormField label="Material item">
                <TextCell
                  editable={false}
                  value={cutLog.workOrderItemId ?? "—"}
                  ariaLabel="Material item"
                />
              </FormField>
            </CellAt>

            <CellAt col={1} colSpan={4}>
              <FormField label="Created">
                <TextCell
                  editable={false}
                  value={formatCutLogTimestamp(cutLog.createdAt)}
                  ariaLabel="Created"
                />
              </FormField>
            </CellAt>
            <CellAt col={5} colSpan={4}>
              <FormField label="Updated">
                <TextCell
                  editable={false}
                  value={formatCutLogTimestamp(cutLog.updatedAt)}
                  ariaLabel="Updated"
                />
              </FormField>
            </CellAt>
          </FieldSection>
        </div>
      ) : null}
    </SidePanel>
  )
}
