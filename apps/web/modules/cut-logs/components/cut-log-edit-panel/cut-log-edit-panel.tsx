"use client"

import { useMemo, type ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import {
  HubSidePanelEditToolbar,
  HubSidePanelShell,
} from "@/components/hub-side-panel"
import type { CutLogEditPanelController } from "@/modules/cut-logs/controllers/cut-log-side-panel"
import { CutLogEditFormFields } from "./cut-log-edit-form-fields"
import { CutLogEditHeader } from "./cut-log-edit-header"
import { CutLogInventoryPickerTakeover } from "./pickers/cut-log-inventory-picker-takeover"
import { CutLogLocationPickerTakeover } from "./pickers/cut-log-location-picker-takeover"
import {
  CutLogEditFinalizeButton,
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
   * inventory. Renders a "Hub view" button in the toolbar's left cluster
   * in edit mode only — create mode has no parent inventory yet to view.
   * Caller wires this to `inventoryHubPanel.openForView(inventoryId)`.
   */
  onOpenHubView?: (inventoryId: string) => void
}

/**
 * Right-anchored cut-log side panel built on the hub-side-panel
 * primitives (`HubSidePanelShell` + `HubSidePanelEditToolbar` +
 * `HubSidePanelPicker`). Migrated off the legacy `SidePanelPreview` +
 * footer-buttons shape so the standalone panel and the inventory hub
 * share the same chrome.
 *
 * Two modes:
 *   - create: opened from the work-orders record view's "+ Add Cut Log"
 *     button. Body renders the create form (Location + Inventory
 *     `HubSidePanelPickerTrigger` buttons + cut / notes / waste cells).
 *     Clicking a trigger swaps the body into a `HubSidePanelPicker`
 *     takeover view via `controller.pickerKind`.
 *   - edit: opened directly (legacy paths). Body renders the
 *     `CutLogEditHeader` (WO + WOMI relink pickers + status / final
 *     sequence) above `CutLogEditFormFields` (readonly summary + 3
 *     editable cells). Most edit flows now go through the inventory
 *     hub (see `InventoryHubSidePanel`); this path is preserved for
 *     consistency.
 *
 * Toolbar: `HubSidePanelEditToolbar` with Save / Discard / Delete on the
 * right cluster, Finalize / Void on the left (edit mode only — both
 * controls render `null` based on row status). The "Hub view" jump
 * lives in the left cluster (edit mode + `onOpenHubView` prop set).
 * Toolbar collapses to `null` while a picker takeover is active —
 * picker body owns its own search input + cancel-on-Escape behavior.
 */
export function CutLogEditPanel({ controller, onOpenHubView }: CutLogEditPanelProps) {
  const {
    open,
    pickerKind,
    isDirty,
    isSaving,
    error,
    save,
    discard,
    close,
    deleteCutLog,
  } = controller

  const isOpen = open !== null
  const mode = open?.mode ?? "edit"
  const cutLog = open?.mode === "edit" ? open.cutLog : null
  const isPickerActive = pickerKind !== null

  const title = useMemo<ReactNode>(() => {
    if (isPickerActive) {
      if (pickerKind === "location") return "Select location"
      if (pickerKind === "inventory") return "Select inventory"
    }
    if (mode === "create") return "New cut log"
    return cutLog?.cutLogNumber ?? "Cut log"
  }, [isPickerActive, pickerKind, mode, cutLog])

  const isPending = cutLog?.status === "PENDING"
  const deleteDisabled = !isPending
  const deleteTitle =
    mode === "edit" && deleteDisabled && !isSaving
      ? "Only pending cut logs can be deleted"
      : undefined

  const extraLeftActions = useMemo<ReactNode>(() => {
    // Only render extras in edit mode — create mode has no cut log to
    // finalize / void or to anchor a hub-view jump.
    if (mode !== "edit") return null
    const hubViewButton =
      cutLog && onOpenHubView ? (
        <button
          type="button"
          onClick={() => onOpenHubView(cutLog.inventoryId)}
          disabled={isSaving}
          className={HUB_VIEW_BUTTON_CLASS_NAME}
          aria-label="Open inventory hub view"
        >
          <span>Hub view</span>
          <ChevronRight size={14} />
        </button>
      ) : null
    return (
      <>
        {hubViewButton}
        <CutLogEditFinalizeButton controller={controller} mode="edit" />
        <CutLogEditVoidButton controller={controller} mode="edit" />
      </>
    )
  }, [mode, cutLog, onOpenHubView, isSaving, controller])

  const topToolbar = useMemo<ReactNode>(() => {
    if (isPickerActive) return null
    // canSave needs both isDirty and create-mode-specific validity; the
    // controller's save dispatcher already no-ops when invalid, so we
    // gate the button on the dirty signal alone.
    const onDelete = mode === "edit" && cutLog ? deleteCutLog : undefined
    return (
      <HubSidePanelEditToolbar
        isDirty={isDirty}
        isSaving={isSaving}
        canSave={isDirty}
        onSave={save}
        onDiscard={discard}
        onDelete={onDelete}
        deleteDisabled={deleteDisabled}
        deleteTitle={deleteTitle}
        extraLeftActions={extraLeftActions}
        saveLabel={mode === "create" ? "Create" : undefined}
        savingLabel={mode === "create" ? "Creating…" : undefined}
        errorMessage={error}
      />
    )
  }, [
    isPickerActive,
    mode,
    cutLog,
    deleteCutLog,
    isDirty,
    isSaving,
    save,
    discard,
    deleteDisabled,
    deleteTitle,
    extraLeftActions,
    error,
  ])

  return (
    <HubSidePanelShell open={isOpen} onClose={close} title={title} topToolbar={topToolbar}>
      {isPickerActive ? (
        pickerKind === "location" ? (
          <CutLogLocationPickerTakeover controller={controller} />
        ) : pickerKind === "inventory" ? (
          <CutLogInventoryPickerTakeover controller={controller} />
        ) : null
      ) : open ? (
        <div className="flex flex-col gap-4">
          {mode === "edit" && cutLog ? (
            <CutLogEditHeader cutLog={cutLog} controller={controller} />
          ) : null}
          <CutLogEditFormFields mode={mode} cutLog={cutLog} controller={controller} />
        </div>
      ) : null}
    </HubSidePanelShell>
  )
}
