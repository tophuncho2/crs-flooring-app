"use client"

import { SidePanel } from "@/components/nav/side-panel"
import type { StagedInvRowEditPanelController } from "@/modules/imports/controllers/record/staged-inventory-filter-rows/use-staged-inv-row-edit-panel"
import { StagedInvRowEditActionButtons } from "./staged-inv-row-edit-action-buttons"
import { StagedInvRowEditFormFields } from "./staged-inv-row-edit-form-fields"

export type StagedInvRowEditPanelProps = {
  controller: StagedInvRowEditPanelController
}

/**
 * Right-anchored side panel that owns the staged-inv-row control stack
 * — edit, save, delete — for a single staged inventory row at a time.
 * Built on the shared `SidePanel` chrome; form layout uses
 * `FieldSection` (8-col invisible grid). Mirrors `CutLogEditPanel`.
 */
export function StagedInvRowEditPanel({ controller }: StagedInvRowEditPanelProps) {
  const { open } = controller
  const isOpen = open !== null
  const mode = open?.mode ?? "edit"
  const title =
    mode === "create"
      ? "New staged inventory row"
      : open?.mode === "edit"
        ? open.row.rollNumber
          ? `${open.row.rollPrefix || "ROLL#"}${open.row.rollNumber}`
          : "Staged inventory row"
        : "Staged inventory row"

  const canDelete = open?.mode === "edit" && open.row.status === "DRAFT"

  return (
    <SidePanel
      open={isOpen}
      side="right"
      onClose={controller.close}
      title={title}
      widthClassName="w-[28rem]"
    >
      <div className="flex h-full flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-4 pb-24">
          {open ? <StagedInvRowEditFormFields controller={controller} /> : null}
          {controller.error ? (
            <div className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
              {controller.error}
            </div>
          ) : null}
        </div>
        <StagedInvRowEditActionButtons
          mode={mode}
          isDirty={controller.isDirty}
          isSaving={controller.isSaving}
          canSave={controller.canSave}
          canDelete={canDelete}
          onSave={controller.save}
          onClose={controller.close}
          onDelete={controller.deleteRow}
        />
      </div>
    </SidePanel>
  )
}
