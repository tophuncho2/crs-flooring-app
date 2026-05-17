"use client"

import { SidePanelPreview } from "@/components/side-panel-preview"
import type { ManagementCompanySidePanelController } from "@/modules/management-companies/controllers/use-management-company-side-panel"
import { ManagementCompanySidePanelActions } from "./management-company-side-panel-actions"
import { ManagementCompanySidePanelForm } from "./management-company-side-panel-form"

export type ManagementCompanySidePanelProps = {
  controller: ManagementCompanySidePanelController
}

/**
 * Right-anchored side panel that owns the management-company create + edit
 * flow from the MC list view. One panel, two modes:
 *   - create: blank form, "Create" button, no delete.
 *   - edit:   form prefilled from the row clicked on the list; "Save" + "Delete".
 *
 * Open state lives entirely in the controller; this component is a pure
 * projection. After a successful create the controller transitions to edit
 * mode for the new record (panel stays open); after delete the panel closes.
 */
export function ManagementCompanySidePanel({ controller }: ManagementCompanySidePanelProps) {
  const { open, mode, isSaving, canSave, error, save, close, deleteCompany, form } = controller
  const isOpen = open !== null
  const resolvedMode = mode ?? "create"

  const title =
    resolvedMode === "create"
      ? "New management company"
      : form.name.trim() === ""
        ? "Management company"
        : form.name

  return (
    <SidePanelPreview
      open={isOpen}
      side="right"
      onClose={close}
      title={title}
      widthClassName="w-[34rem]"
      footer={
        <ManagementCompanySidePanelActions
          mode={resolvedMode}
          isSaving={isSaving}
          canSave={canSave}
          onSave={save}
          onClose={close}
          onDelete={deleteCompany}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {isOpen ? <ManagementCompanySidePanelForm controller={controller} /> : null}
        {error ? (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
      </div>
    </SidePanelPreview>
  )
}
