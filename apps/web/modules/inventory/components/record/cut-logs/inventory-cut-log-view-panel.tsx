"use client"

import { CutLogStatusBadge } from "@/components/badges/cut-log-status-badge"
import { TextCell } from "@/components/cells"
import { formatCutLogTimestamp } from "@/components/features/cut-log-row"
import { FieldSection, FormField } from "@/components/fields"
import { CellAt } from "@/components/layout-grid"
import { SidePanel } from "@/components/nav/side-panel"
import type { InventoryCutLogViewPanelController } from "@/modules/inventory/controllers/use-inventory-cut-log-view-panel"

export type InventoryCutLogViewPanelProps = {
  controller: InventoryCutLogViewPanelController
}

/**
 * Right-anchored view-only side panel for inventory cut logs. Surfaces the
 * link/identity context the row grid intentionally drops: status, cut #,
 * the cut log's parent work order number, the parent material item's
 * product label, and the audit timestamps. All other cut-log fields
 * (cut/coverage/before/after/waste/notes) stay in the row grid where the
 * user can scan them at a glance. Cut-log editing is only available from
 * the work-orders record view.
 */
export function InventoryCutLogViewPanel({
  controller,
}: InventoryCutLogViewPanelProps) {
  const { open, close } = controller
  const cutLog = open?.cutLog ?? null

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
            <CellAt col={1} colSpan={4}>
              <FormField label="Status">
                <div className="flex items-center">
                  <CutLogStatusBadge status={cutLog.status} />
                </div>
              </FormField>
            </CellAt>
            <CellAt col={5} colSpan={4}>
              <FormField label="Cut number">
                <TextCell editable={false} value={cutLog.cutLogNumber} ariaLabel="Cut number" />
              </FormField>
            </CellAt>

            <CellAt col={1} colSpan={4}>
              <FormField label="Work order">
                <TextCell
                  editable={false}
                  value={cutLog.workOrderNumber ?? "—"}
                  ariaLabel="Work order"
                />
              </FormField>
            </CellAt>
            <CellAt col={5} colSpan={4}>
              <FormField label="Material item">
                <TextCell
                  editable={false}
                  value={cutLog.workOrderItemProductLabel ?? "—"}
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
