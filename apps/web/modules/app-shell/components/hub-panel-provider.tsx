"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react"
import type { ManagementCompanyListRow, PropertyListRow } from "@builders/domain"
import { HubSidePanelAddButton, HubSidePanelShell } from "@/components/hub-side-panel"
import { PropertyHubSidePanel } from "@/modules/properties/components/side-panel/hub"
import { TemplateSyncBody } from "@/modules/template-sync/components/template-sync-body"
import { TemplateSyncTopToolbar } from "@/modules/template-sync/components/template-sync-top-toolbar"
import { useTemplateSyncController } from "@/modules/template-sync/controllers/use-template-sync-controller"

export type HubPanelContextValue = {
  /** Open the unified panel on the template-sync cascade (header button). */
  openCascade: () => void
  /** Open the hub on the combined "+ Hub" create form. */
  openForCreate: () => void
  /** Open the hub straight into a property's edit view. */
  openForPropertyEdit: (row: PropertyListRow) => void
  /** Open the hub straight into a management company's edit view. */
  openForMcEdit: (row: ManagementCompanyListRow) => void
}

const HubPanelContext = createContext<HubPanelContextValue | null>(null)

/**
 * Mounts the single, app-wide hub + template-sync panel once and shares its
 * openers via context. Every dashboard surface — the header button, the
 * properties list, the management-companies list — drives this one instance,
 * so there is exactly one panel in the DOM and one piece of state. Record-page
 * hub pickers (work orders / templates) intentionally keep their own scoped
 * instances and do not go through here.
 */
export function HubPanelProvider({ children }: { children: ReactNode }) {
  const controller = useTemplateSyncController()
  const {
    open,
    setOpen,
    handleClose,
    handleCreate,
    handleCreateHub,
    handleOpenTemplateRow,
    hubPanel,
  } = controller
  const { openForCreate, openForPropertyEdit, openForMcEdit, close: closeHub } = hubPanel

  const openCascade = useCallback(() => setOpen(true), [setOpen])

  // "Back to sync": from the hub view, the left chevron closes the hub and
  // opens the template-sync cascade (empty — selections don't carry over).
  const handleBackToSync = useCallback(() => {
    closeHub()
    setOpen(true)
  }, [closeHub, setOpen])

  const value = useMemo<HubPanelContextValue>(
    () => ({ openCascade, openForCreate, openForPropertyEdit, openForMcEdit }),
    [openCascade, openForCreate, openForPropertyEdit, openForMcEdit],
  )

  return (
    <HubPanelContext.Provider value={value}>
      {children}
      <HubSidePanelShell
        open={open}
        onClose={handleClose}
        title="Hub & template sync"
        topToolbar={<TemplateSyncTopToolbar controller={controller} />}
        titleEnd={
          <>
            <HubSidePanelAddButton label="+Template" onClick={handleCreate} />
            <HubSidePanelAddButton onClick={handleCreateHub} />
          </>
        }
      >
        <TemplateSyncBody controller={controller} />
      </HubSidePanelShell>
      <PropertyHubSidePanel
        controller={hubPanel}
        onOpenTemplate={handleOpenTemplateRow}
        onBackToSync={handleBackToSync}
      />
    </HubPanelContext.Provider>
  )
}

export function useHubPanel(): HubPanelContextValue {
  const value = useContext(HubPanelContext)
  if (value === null) {
    throw new Error("useHubPanel must be used within a HubPanelProvider")
  }
  return value
}
