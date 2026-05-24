"use client"

import { useMemo, type ReactNode } from "react"
import {
  HubSidePanelEditToolbar,
  HubSidePanelShell,
} from "@/components/hub-side-panel"
import type { WarehouseSidePanelController } from "@/modules/warehouse/controllers/use-warehouse-side-panel"
import { WarehouseSidePanelDetailSummary } from "./warehouse-side-panel-detail-summary"
import { WarehouseSidePanelFormFields } from "./warehouse-side-panel-form-fields"

export type WarehouseSidePanelProps = {
  controller: WarehouseSidePanelController
}

/**
 * Right-anchored side panel that owns the warehouse create + edit + delete
 * flows. Built on the canonical hub-panel stack: `HubSidePanelShell` locks the
 * shared width and pins a `HubSidePanelEditToolbar` (status pill + Save /
 * Discard / Delete + inline error) in the sticky header. The scrolling body
 * holds an optional read-only summary card (edit mode) above the form fields.
 *
 * The parent (warehouse list client) renders this once alongside the table
 * and drives it through `useWarehouseSidePanel`. Row click → edit mode;
 * "+ Warehouse" → create mode. Both ride the same controller.
 */
export function WarehouseSidePanel({ controller }: WarehouseSidePanelProps) {
  const { open, isDirty, isSaving, isValid, error, save, discard, close } =
    controller
  const isOpen = open !== null
  const mode = open?.mode ?? "edit"
  const warehouse = open?.mode === "edit" ? open.warehouse : null

  const title =
    mode === "create" ? "New warehouse" : (warehouse?.name ?? "Warehouse")

  const topToolbar = useMemo<ReactNode>(() => {
    if (mode === "create") {
      return (
        <HubSidePanelEditToolbar
          isDirty={isDirty}
          isSaving={isSaving}
          canSave={isValid}
          onSave={save}
          onDiscard={discard}
          saveLabel="Create"
          savingLabel="Creating…"
          errorMessage={error}
        />
      )
    }
    return (
      <HubSidePanelEditToolbar
        isDirty={isDirty}
        isSaving={isSaving}
        canSave={isValid}
        onSave={save}
        onDiscard={discard}
        onDelete={controller.deleteWarehouse}
        errorMessage={error}
      />
    )
  }, [mode, isDirty, isSaving, isValid, save, discard, error, controller.deleteWarehouse])

  return (
    <HubSidePanelShell
      open={isOpen}
      onClose={close}
      title={title}
      topToolbar={topToolbar}
    >
      {open ? (
        <div className="flex flex-col gap-4">
          {warehouse ? <WarehouseSidePanelDetailSummary warehouse={warehouse} /> : null}
          <WarehouseSidePanelFormFields controller={controller} />
        </div>
      ) : null}
    </HubSidePanelShell>
  )
}
