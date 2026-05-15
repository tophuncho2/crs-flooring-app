"use client"

import { SidePanelPreview } from "@/components/side-panel-preview"
import type { ManufacturerSidePanelController } from "@/modules/manufacturers/controllers/use-manufacturer-side-panel"
import { ManufacturerSidePanelActionButtons } from "./toolbar-controls/manufacturer-side-panel-action-buttons"
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
        <ManufacturerSidePanelActionButtons
          mode={mode}
          isDirty={controller.isDirty}
          isSaving={controller.isSaving}
          canSave={controller.isValid}
          onSave={controller.save}
          onClose={controller.close}
          onDelete={controller.deleteManufacturer}
        />
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
