"use client"

import { SidePanelPreview } from "@/components/side-panel-preview"
import type { ManufacturerSidePanelController } from "@/modules/manufacturers/controllers/use-manufacturer-side-panel"
import { ManufacturerSidePanelDeleteButton } from "./toolbar-controls/manufacturer-side-panel-delete-button"
import { ManufacturerSidePanelDiscardButton } from "./toolbar-controls/manufacturer-side-panel-discard-button"
import { ManufacturerSidePanelSaveButton } from "./toolbar-controls/manufacturer-side-panel-save-button"
import { ManufacturerSidePanelStatusPill } from "./toolbar-controls/manufacturer-side-panel-status-pill"
import { ManufacturerSidePanelDetailSummary } from "./manufacturer-side-panel-detail-summary"
import { ManufacturerSidePanelFormFields } from "./manufacturer-side-panel-form-fields"

export type ManufacturerSidePanelProps = {
  controller: ManufacturerSidePanelController
}

export function ManufacturerSidePanel({ controller }: ManufacturerSidePanelProps) {
  const { open } = controller
  const isOpen = open !== null
  const mode = open?.mode ?? "edit"
  const manufacturer = open?.mode === "edit" ? open.manufacturer : null

  const title =
    mode === "create"
      ? "New manufacturer"
      : (manufacturer?.companyName || manufacturer?.agentName || "Manufacturer")

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
            <ManufacturerSidePanelStatusPill controller={controller} />
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <ManufacturerSidePanelDeleteButton controller={controller} mode={mode} />
            <ManufacturerSidePanelDiscardButton controller={controller} />
            <ManufacturerSidePanelSaveButton controller={controller} mode={mode} />
          </div>
        </div>
      }
    >
      {open ? (
        <div className="flex flex-col gap-4">
          {manufacturer ? (
            <ManufacturerSidePanelDetailSummary manufacturer={manufacturer} />
          ) : null}
          <ManufacturerSidePanelFormFields controller={controller} />
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
