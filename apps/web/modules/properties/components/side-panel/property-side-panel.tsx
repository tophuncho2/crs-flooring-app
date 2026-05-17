"use client"

import { SidePanelPreview } from "@/components/side-panel-preview"
import type { PropertySidePanelController } from "@/modules/properties/controllers/use-property-side-panel"
import { PropertySidePanelActions } from "./property-side-panel-actions"
import { PropertySidePanelForm } from "./property-side-panel-form"

export type PropertySidePanelProps = {
  controller: PropertySidePanelController
}

/**
 * Right-anchored side panel that owns the property create + edit flow
 * from the properties list view. One panel, two modes:
 *   - create: blank form, "Create" button, no delete.
 *   - edit:   form prefilled from the row clicked on the list; "Save" + "Delete".
 *
 * Open state lives entirely in the controller; this component is a pure
 * projection. After a successful create the controller transitions to edit
 * mode for the new record (panel stays open); after delete the panel closes.
 */
export function PropertySidePanel({ controller }: PropertySidePanelProps) {
  const { open, mode, isSaving, canSave, error, save, close, deleteProperty, form } = controller
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
        <PropertySidePanelActions
          mode={resolvedMode}
          isSaving={isSaving}
          canSave={canSave}
          onSave={save}
          onClose={close}
          onDelete={deleteProperty}
        />
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
