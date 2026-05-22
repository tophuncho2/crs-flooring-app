"use client"

import type { ReactNode } from "react"
import { ChevronLeft } from "lucide-react"
import {
  SidePanelEditDeleteButton,
  SidePanelEditDiscardButton,
  SidePanelEditSaveButton,
  SidePanelEditStatusPill,
} from "@/components/side-panel-edit/controls"

const HUB_VIEW_BUTTON_CLASS_NAME = [
  "inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-all duration-200",
  "border-[var(--panel-border)] bg-[var(--panel-background)] text-[var(--foreground)]/80",
  "hover:border-blue-500/40 hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)] hover:shadow-[0_0_18px_rgba(59,130,246,0.22)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ")

export type HubSidePanelEditToolbarProps = {
  isDirty: boolean
  isSaving: boolean
  canSave?: boolean
  hasConflict?: boolean
  onSave: () => void
  onDiscard: () => void
  /** Omit to hide the delete button (e.g. in create mode). */
  onDelete?: () => void
  /**
   * Optional "back to hub view" navigation. Discards local draft changes
   * and pops the panel into the hub's view mode. Omit when the panel has
   * no parent hub to return to (e.g. create mode, or property-edit for an
   * orphan property).
   */
  onOpenHubView?: () => void
  /**
   * Optional extra controls rendered in the left cluster, after the
   * status pill and back-arrow. Used by hubs that need domain-specific
   * actions alongside save/discard/delete (e.g. cut-log finalize / void).
   */
  extraLeftActions?: ReactNode
  saveLabel?: string
  savingLabel?: string
  errorMessage?: string | null
}

/**
 * Top-of-panel edit toolbar. Left cluster: status pill + optional "Open
 * hub view" navigation (discards the draft). Right cluster: Save /
 * Discard / Delete mutations.
 *
 * Replaces the legacy footer action bar — the hub side-panel modes pin
 * actions to the sticky header so they never overlap scrolling content
 * and always read as the section's controls.
 */
export function HubSidePanelEditToolbar({
  isDirty,
  isSaving,
  canSave = true,
  hasConflict = false,
  onSave,
  onDiscard,
  onDelete,
  onOpenHubView,
  extraLeftActions,
  saveLabel,
  savingLabel,
  errorMessage,
}: HubSidePanelEditToolbarProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <SidePanelEditStatusPill
            isDirty={isDirty}
            isSaving={isSaving}
            hasConflict={hasConflict}
          />
          {onOpenHubView ? (
            <button
              type="button"
              onClick={onOpenHubView}
              disabled={isSaving}
              className={HUB_VIEW_BUTTON_CLASS_NAME}
              aria-label="Open hub view (discards changes)"
            >
              <ChevronLeft size={14} />
              <span>Hub view</span>
            </button>
          ) : null}
          {extraLeftActions}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onDelete ? (
            <SidePanelEditDeleteButton isSaving={isSaving} onClick={onDelete} />
          ) : null}
          <SidePanelEditDiscardButton
            isDirty={isDirty}
            isSaving={isSaving}
            onClick={onDiscard}
          />
          <SidePanelEditSaveButton
            isDirty={isDirty}
            isSaving={isSaving}
            canSave={canSave}
            onClick={onSave}
            label={saveLabel}
            savingLabel={savingLabel}
          />
        </div>
      </div>
      {errorMessage ? (
        <p className="text-xs text-rose-500" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
