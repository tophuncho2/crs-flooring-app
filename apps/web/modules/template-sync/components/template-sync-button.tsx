"use client"

import { RefreshCw } from "lucide-react"
import { HubSidePanelShell } from "@/components/hub-side-panel"
import { PropertyHubSidePanel } from "@/modules/properties/components/side-panel/hub"
import { useTemplateSyncController } from "@/modules/template-sync/controllers/use-template-sync-controller"
import { TemplateSyncBody } from "./template-sync-body"
import { TemplateSyncTopToolbar } from "./template-sync-top-toolbar"

// Cascade: Management Company (optional) → Property → Template.
// All three pickers are body-mode: their triggers in the sticky top-toolbar
// toggle the side-panel body between the options surface and the template
// preview. Only one picker may be expanded at a time — switching collapses
// the others.

export function TemplateSyncButton() {
  const controller = useTemplateSyncController()
  const { open, setOpen, handleClose, hubPanel, handleOpenTemplateRow } = controller

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open template sync"
        className="
          w-10 h-10 rounded-full
          bg-[var(--panel-background)]
          border border-[var(--panel-border)]
          flex items-center justify-center
          hover:bg-[var(--panel-hover)]
          transition
          shadow-[0_0_6px_rgba(59,130,246,0.25)]
        "
      >
        <RefreshCw size={18} className="text-blue-500" />
      </button>

      <HubSidePanelShell
        open={open}
        onClose={handleClose}
        title="Hub & template sync"
        topToolbar={<TemplateSyncTopToolbar controller={controller} />}
      >
        <TemplateSyncBody controller={controller} />
      </HubSidePanelShell>

      <PropertyHubSidePanel controller={hubPanel} onOpenTemplate={handleOpenTemplateRow} />
    </>
  )
}
