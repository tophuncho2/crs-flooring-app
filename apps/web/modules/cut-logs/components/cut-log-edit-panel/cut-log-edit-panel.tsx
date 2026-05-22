"use client"

import { ChevronRight } from "lucide-react"
import { SidePanelPreview } from "@/components/side-panel-preview"
import type { CutLogEditPanelController } from "@/modules/cut-logs/controllers/cut-log-side-panel"
import { CutLogEditFormFields } from "./cut-log-edit-form-fields"
import { CutLogEditHeader } from "./cut-log-edit-header"
import {
  CutLogEditDeleteButton,
  CutLogEditDiscardButton,
  CutLogEditFinalizeButton,
  CutLogEditSaveButton,
  CutLogEditStatusPill,
  CutLogEditVoidButton,
} from "./toolbar-controls"

const HUB_VIEW_BUTTON_CLASS_NAME = [
  "inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-all duration-200",
  "border-[var(--panel-border)] bg-[var(--panel-background)] text-[var(--foreground)]/80",
  "hover:border-blue-500/40 hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)] hover:shadow-[0_0_18px_rgba(59,130,246,0.22)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ")

export type CutLogEditPanelProps = {
  controller: CutLogEditPanelController
  /**
   * Optional jump to the inventory hub view for this cut log's parent
   * inventory. Renders a "Hub view" button in the footer in edit mode
   * only (create mode has no parent inventory to view yet). Caller wires
   * this to `inventoryHubPanel.openForView(inventoryId)`. Omit on
   * surfaces that don't host a hub controller — the button is gated on
   * presence of this prop.
   */
  onOpenHubView?: (inventoryId: string) => void
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
export function CutLogEditPanel({ controller, onOpenHubView }: CutLogEditPanelProps) {
  const { open } = controller
  const isOpen = open !== null
  const mode = open?.mode ?? "edit"
  const cutLog = open?.mode === "edit" ? open.cutLog : null

  const title =
    mode === "create" ? "New cut log" : (cutLog?.cutLogNumber ?? "Cut log")

  const stickyHeader = cutLog ? (
    <CutLogEditHeader cutLog={cutLog} controller={controller} />
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <CutLogEditSaveButton controller={controller} mode={mode} />
            <CutLogEditDiscardButton controller={controller} />
            <CutLogEditFinalizeButton controller={controller} mode={mode} />
            <CutLogEditVoidButton controller={controller} mode={mode} />
            {/* Hub view jumps to the inventory hub for this cut log's
                parent inventory. Edit mode only — create mode has no
                parent inventory yet. Hidden when the caller didn't wire
                onOpenHubView (e.g. surfaces without a hub controller). */}
            {mode === "edit" && cutLog && onOpenHubView ? (
              <button
                type="button"
                onClick={() => onOpenHubView(cutLog.inventoryId)}
                disabled={controller.isSaving}
                className={HUB_VIEW_BUTTON_CLASS_NAME}
                aria-label="Open inventory hub view"
              >
                <span>Hub view</span>
                <ChevronRight size={14} />
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <CutLogEditStatusPill controller={controller} />
            <CutLogEditDeleteButton controller={controller} mode={mode} />
          </div>
        </div>
      }
    >
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
    </SidePanelPreview>
  )
}
