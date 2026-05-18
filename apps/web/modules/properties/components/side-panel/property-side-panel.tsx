"use client"

import { SidePanelPreview } from "@/components/side-panel-preview"
import type { PropertySidePanelController } from "@/modules/properties/controllers/use-property-side-panel"
import { PropertySidePanelDeleteButton } from "./toolbar-controls/property-side-panel-delete-button"
import { PropertySidePanelDiscardButton } from "./toolbar-controls/property-side-panel-discard-button"
import { PropertySidePanelHubViewButton } from "./toolbar-controls/property-side-panel-hub-view-button"
import { PropertySidePanelSaveButton } from "./toolbar-controls/property-side-panel-save-button"
import { PropertySidePanelStatusPill } from "./toolbar-controls/property-side-panel-status-pill"
import { PropertySidePanelForm } from "./property-side-panel-form"

export type PropertySidePanelProps = {
  controller: PropertySidePanelController
}

/**
 * Right-anchored side panel that owns the property create + edit flow from
 * the properties list view. Footer composed from the canonical
 * side-panel-edit toolbar controls: status pill + delete + discard + save.
 * The title-bar X (provided by SidePanelPreview) handles close.
 */
export function PropertySidePanel({ controller }: PropertySidePanelProps) {
  const { open, mode, error, close, form } = controller
  const isOpen = open !== null
  const resolvedMode = mode ?? "create"

  const title =
    resolvedMode === "create"
      ? "New property"
      : form.name.trim() === ""
        ? "Property"
        : form.name

  return (
    <SidePanelPreview
      open={isOpen}
      side="right"
      onClose={close}
      title={title}
      widthClassName="w-[34rem]"
      footer={
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <PropertySidePanelSaveButton controller={controller} mode={resolvedMode} />
            <PropertySidePanelDiscardButton controller={controller} />
            <PropertySidePanelHubViewButton controller={controller} />
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <PropertySidePanelStatusPill controller={controller} />
            <PropertySidePanelDeleteButton controller={controller} mode={resolvedMode} />
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {isOpen ? <PropertySidePanelForm controller={controller} /> : null}
        {error ? (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
      </div>
    </SidePanelPreview>
  )
}
