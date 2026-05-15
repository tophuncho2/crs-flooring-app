"use client"

import { SidePanelPreview } from "@/components/side-panel-preview"
import type { CutLogEditPanelController } from "@/modules/cut-logs/controllers/use-cut-log-edit-panel"
import { CutLogEditActionButtons } from "./cut-log-edit-action-buttons"
import { CutLogEditFormFields } from "./cut-log-edit-form-fields"
import { CutLogEditHeader } from "./cut-log-edit-header"

export type CutLogEditPanelProps = {
  controller: CutLogEditPanelController
}

/**
 * Right-anchored side panel that owns the entire cut-log control stack —
 * edit, save, finalize, void, delete — for a single cut log at a time. Built
 * on the canonical `SidePanelPreview` primitive: title bar, sticky-header
 * pickers (edit mode only), scrolling form body, sticky footer with action
 * buttons. Form layout uses `FieldSection` (8-col invisible grid).
 *
 * The parent passes in a `useCutLogEditPanel` controller and renders this
 * once alongside its grid. Open state lives entirely in the controller; this
 * component is a pure projection.
 */
export function CutLogEditPanel({ controller }: CutLogEditPanelProps) {
  const { open } = controller
  const isOpen = open !== null
  const mode = open?.mode ?? "edit"
  const cutLog = open?.mode === "edit" ? open.cutLog : null

  const title =
    mode === "create" ? "New cut log" : (cutLog?.cutLogNumber ?? "Cut log")

  const canSave =
    mode === "create"
      ? controller.form.inventoryId !== "" && controller.form.cut.trim() !== ""
      : controller.form.cut.trim() !== ""

  const stickyHeader = cutLog ? (
    <CutLogEditHeader cutLog={cutLog} isSaving={controller.isSaving} />
  ) : undefined

  return (
    <SidePanelPreview
      open={isOpen}
      side="right"
      onClose={controller.close}
      title={title}
      widthClassName="w-[34rem]"
      stickyHeader={stickyHeader}
      footer={
        <CutLogEditActionButtons
          mode={mode}
          cutLog={cutLog}
          isDirty={controller.isDirty}
          isSaving={controller.isSaving}
          canSave={canSave}
          onSave={controller.save}
          onClose={controller.close}
          onFinalize={controller.finalize}
          onVoid={controller.voidCutLog}
          onDelete={controller.deleteCutLog}
        />
      }
    >
      <div className="flex h-full flex-col">
        <div className="mt-auto">
          {open ? (
            <CutLogEditFormFields
              mode={mode}
              cutLog={cutLog}
              controller={controller}
            />
          ) : null}
          {controller.error ? (
            <div className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
              {controller.error}
            </div>
          ) : null}
        </div>
      </div>
    </SidePanelPreview>
  )
}
