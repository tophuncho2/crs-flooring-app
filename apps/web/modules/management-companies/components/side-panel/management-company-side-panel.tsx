"use client"

import { SidePanelPreview } from "@/components/side-panel-preview"
import type { ManagementCompanySidePanelController } from "@/modules/management-companies/controllers/list/use-management-company-side-panel"
import { ManagementCompanySidePanelDeleteButton } from "./toolbar-controls/management-company-side-panel-delete-button"
import { ManagementCompanySidePanelDiscardButton } from "./toolbar-controls/management-company-side-panel-discard-button"
import { ManagementCompanySidePanelHubViewButton } from "./toolbar-controls/management-company-side-panel-hub-view-button"
import { ManagementCompanySidePanelSaveButton } from "./toolbar-controls/management-company-side-panel-save-button"
import { ManagementCompanySidePanelStatusPill } from "./toolbar-controls/management-company-side-panel-status-pill"
import { ManagementCompanySidePanelForm } from "./management-company-side-panel-form"

export type ManagementCompanySidePanelProps = {
  controller: ManagementCompanySidePanelController
}

/**
 * Right-anchored side panel that owns the management-company create + edit
 * flow from the MC list view. Footer composed from the canonical
 * side-panel-edit toolbar controls: status pill + delete + discard + save.
 * The title-bar X (provided by SidePanelPreview) handles close.
 */
export function ManagementCompanySidePanel({ controller }: ManagementCompanySidePanelProps) {
  const { open, mode, error, close, form } = controller
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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ManagementCompanySidePanelSaveButton controller={controller} mode={resolvedMode} />
          <ManagementCompanySidePanelDiscardButton controller={controller} />
          <ManagementCompanySidePanelHubViewButton controller={controller} />
          <ManagementCompanySidePanelStatusPill controller={controller} />
          <ManagementCompanySidePanelDeleteButton controller={controller} mode={resolvedMode} />
        </div>
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
