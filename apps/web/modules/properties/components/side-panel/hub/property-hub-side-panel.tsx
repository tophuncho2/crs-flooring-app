"use client"

import { SidePanelPreview } from "@/components/side-panel-preview"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/side-panel/use-property-hub-side-panel"
import { PropertyHubSidePanelForm } from "./property-hub-side-panel-form"

export type PropertyHubSidePanelProps = {
  controller: PropertyHubSidePanelController
}

/**
 * Right-anchored side panel that owns the "+ Hub" create flow. Top section
 * is a management company picker + create-fields (mutually exclusive); bottom
 * section is property fields. Either half is optional, but at least one must
 * be filled. The single Save button submits both halves in one transaction
 * via POST /api/properties/hub.
 */
export function PropertyHubSidePanel({ controller }: PropertyHubSidePanelProps) {
  const {
    isOpen,
    canSave,
    isSaving,
    hasAnyInteraction,
    validationError,
    error,
    close,
    discard,
    save,
  } = controller

  return (
    <SidePanelPreview
      open={isOpen}
      side="right"
      onClose={close}
      title="New hub"
      widthClassName="w-[34rem]"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="rounded-md border border-emerald-600/70 bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={discard}
            disabled={isSaving || !hasAnyInteraction}
            className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-1.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-[var(--panel-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Discard
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {isOpen ? <PropertyHubSidePanelForm controller={controller} /> : null}
        {validationError ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
            {validationError}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
      </div>
    </SidePanelPreview>
  )
}
