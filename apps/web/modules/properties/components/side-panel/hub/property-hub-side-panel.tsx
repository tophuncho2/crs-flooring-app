"use client"

import { SidePanelPreview } from "@/components/side-panel-preview"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"
import { PropertyHubSidePanelForm } from "./property-hub-side-panel-form"
import { PropertyHubSidePanelDiscardButton } from "./toolbar-controls/property-hub-side-panel-discard-button"
import { PropertyHubSidePanelSaveButton } from "./toolbar-controls/property-hub-side-panel-save-button"

export type PropertyHubSidePanelProps = {
  controller: PropertyHubSidePanelController
}

/**
 * Right-anchored side panel that owns the "+ Hub" create flow. Top section
 * is a management company picker + create-fields (mutually exclusive); bottom
 * section is property fields. Either half is optional, but at least one must
 * be filled. The single Save button submits both halves in one transaction
 * via POST /api/properties/hub.
 */
export function PropertyHubSidePanel({ controller }: PropertyHubSidePanelProps) {
  const { isOpen, validationError, error, close } = controller

  return (
    <SidePanelPreview
      open={isOpen}
      side="right"
      onClose={close}
      title="New hub"
      widthClassName="w-[34rem]"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <PropertyHubSidePanelSaveButton controller={controller} />
          <PropertyHubSidePanelDiscardButton controller={controller} />
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {isOpen ? <PropertyHubSidePanelForm controller={controller} /> : null}
        {validationError ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
            {validationError}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
      </div>
    </SidePanelPreview>
  )
}
