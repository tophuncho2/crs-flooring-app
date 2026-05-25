"use client"

import { useMemo, type ReactNode } from "react"
import {
  HubSidePanelEditToolbar,
  HubSidePanelShell,
} from "@/components/hub-side-panel"
import type { ManufacturerSidePanelController } from "@/modules/manufacturers/controllers/use-manufacturer-side-panel"
import { ManufacturerSidePanelDetailSummary } from "./manufacturer-side-panel-detail-summary"
import { ManufacturerSidePanelFormFields } from "./manufacturer-side-panel-form-fields"

export type ManufacturerSidePanelProps = {
  controller: ManufacturerSidePanelController
}

/**
 * Right-anchored side panel that owns the manufacturer create + edit + delete
 * flows. Built on the canonical hub-panel stack: `HubSidePanelShell` locks the
 * shared width and pins a `HubSidePanelEditToolbar` (status pill + Save /
 * Discard / Delete + inline error) in the sticky header. The scrolling body
 * holds an optional read-only summary card (edit mode) above the form fields.
 */
export function ManufacturerSidePanel({ controller }: ManufacturerSidePanelProps) {
  const { open, isDirty, isSaving, isValid, error, successMessage, save, discard, close } =
    controller
  const isOpen = open !== null
  const mode = open?.mode ?? "edit"
  const manufacturer = open?.mode === "edit" ? open.manufacturer : null

  const title =
    mode === "create"
      ? "New manufacturer"
      : (manufacturer?.companyName || manufacturer?.agentName || "Manufacturer")

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
          successMessage={successMessage}
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
        onDelete={controller.deleteManufacturer}
        errorMessage={error}
        successMessage={successMessage}
      />
    )
  }, [mode, isDirty, isSaving, isValid, save, discard, error, successMessage, controller.deleteManufacturer])

  return (
    <HubSidePanelShell
      open={isOpen}
      onClose={close}
      title={title}
      topToolbar={topToolbar}
    >
      {open ? (
        <div className="flex flex-col gap-4">
          {manufacturer ? (
            <ManufacturerSidePanelDetailSummary manufacturer={manufacturer} />
          ) : null}
          <ManufacturerSidePanelFormFields controller={controller} />
        </div>
      ) : null}
    </HubSidePanelShell>
  )
}
