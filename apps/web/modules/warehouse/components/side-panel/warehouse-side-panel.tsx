"use client"

import { SidePanelPreview } from "@/components/side-panel-preview"
import type { WarehouseSidePanelController } from "@/modules/warehouse/controllers/use-warehouse-side-panel"
import { WarehouseSidePanelDeleteButton } from "./toolbar-controls/warehouse-side-panel-delete-button"
import { WarehouseSidePanelDiscardButton } from "./toolbar-controls/warehouse-side-panel-discard-button"
import { WarehouseSidePanelSaveButton } from "./toolbar-controls/warehouse-side-panel-save-button"
import { WarehouseSidePanelStatusPill } from "./toolbar-controls/warehouse-side-panel-status-pill"
import { WarehouseSidePanelDetailSummary } from "./warehouse-side-panel-detail-summary"
import { WarehouseSidePanelFormFields } from "./warehouse-side-panel-form-fields"

export type WarehouseSidePanelProps = {
  controller: WarehouseSidePanelController
}

/**
 * Right-anchored side panel that owns the warehouse create + edit + delete
 * flows. Built on the canonical `SidePanelPreview` primitive: title bar,
 * scrolling form body (with an optional read-only summary card in edit
 * mode), sticky footer composed from per-control adapters in
 * `./toolbar-controls/`.
 *
 * The parent (warehouse list client) renders this once alongside the table
 * and drives it through `useWarehouseSidePanel`. Row click → edit mode;
 * "+ Warehouse" → create mode. Both ride the same controller.
 */
export function WarehouseSidePanel({ controller }: WarehouseSidePanelProps) {
  const { open } = controller
  const isOpen = open !== null
  const mode = open?.mode ?? "edit"
  const warehouse = open?.mode === "edit" ? open.warehouse : null

  const title =
    mode === "create" ? "New warehouse" : (warehouse?.name ?? "Warehouse")

  return (
    <SidePanelPreview
      open={isOpen}
      side="right"
      onClose={controller.close}
      title={title}
      widthClassName="w-[34rem]"
      footer={
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <WarehouseSidePanelStatusPill controller={controller} />
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <WarehouseSidePanelDeleteButton controller={controller} mode={mode} />
            <WarehouseSidePanelDiscardButton controller={controller} />
            <WarehouseSidePanelSaveButton controller={controller} mode={mode} />
          </div>
        </div>
      }
    >
      {open ? (
        <div className="flex flex-col gap-4">
          {warehouse ? <WarehouseSidePanelDetailSummary warehouse={warehouse} /> : null}
          <WarehouseSidePanelFormFields controller={controller} />
          {controller.error ? (
            <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
              {controller.error}
            </div>
          ) : null}
        </div>
      ) : null}
    </SidePanelPreview>
  )
}
