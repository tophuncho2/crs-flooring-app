"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import type {
  ManagementCompanyListRow,
  PropertyListRow,
  TemplateListRow,
} from "@builders/domain"
import { PropertyHubSidePanel } from "@/modules/properties/components/side-panel/hub"
import { usePropertyHubSidePanel } from "@/modules/properties/controllers/property-hub-side-panel"

const TEMPLATE_SYNC_ROUTE = "/dashboard/template-sync"

export type HubPanelContextValue = {
  /** Navigate to the standalone template-sync cascade page. */
  openCascade: () => void
  /** Open the hub on the combined "+ Hub" create form. */
  openForCreate: () => void
  /** Open the hub straight into a property's edit view (from a list row). */
  openForPropertyEdit: (row: PropertyListRow) => void
  /** Open the hub straight into a management company's edit view (from a list row). */
  openForMcEdit: (row: ManagementCompanyListRow) => void
  /** Open the property edit panel by id (used by the template-sync page picker arrow). */
  openForPropertyEditById: (propertyId: string) => void | Promise<void>
  /** Open the MC edit panel by id (used by the template-sync page picker arrow). */
  openForMcEditById: (managementCompanyId: string) => void | Promise<void>
}

const HubPanelContext = createContext<HubPanelContextValue | null>(null)

/** Build a template-sync deep-link that pre-selects the cascade from a hub template row. */
function buildTemplateSyncPresetHref(row: TemplateListRow): string {
  const params = new URLSearchParams()
  if (row.managementCompanyId) params.set("managementCompanyId", row.managementCompanyId)
  if (row.managementCompanyName) params.set("managementCompanyLabel", row.managementCompanyName)
  if (row.propertyId) params.set("propertyId", row.propertyId)
  if (row.propertyName) params.set("propertyLabel", row.propertyName)
  params.set("templateId", row.id)
  const unit = row.unitType.trim()
  params.set("templateLabel", unit.length > 0 ? unit : "—")
  return `${TEMPLATE_SYNC_ROUTE}?${params.toString()}`
}

/**
 * Mounts the single, app-wide property hub side panel once and shares its
 * openers via context. Every dashboard surface — the properties list, the
 * management-companies list — drives this one instance, so there is exactly
 * one panel in the DOM and one piece of state. Template sync now lives on its
 * own page (`/dashboard/template-sync`); `openCascade` navigates there.
 * Record-page hub pickers (work orders / templates) intentionally keep their
 * own scoped instances and do not go through here.
 */
export function HubPanelProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const hubPanel = usePropertyHubSidePanel()
  const {
    openForCreate,
    openForPropertyEdit,
    openForMcEdit,
    openForPropertyEditById,
    openForMcEditById,
    close: closeHub,
  } = hubPanel

  const openCascade = useCallback(() => {
    router.push(TEMPLATE_SYNC_ROUTE)
  }, [router])

  // Hub view → template-sync page, pre-selected to the clicked row.
  const handleOpenTemplate = useCallback(
    (row: TemplateListRow) => {
      closeHub()
      router.push(buildTemplateSyncPresetHref(row))
    },
    [closeHub, router],
  )

  // "Back to sync": from the hub view, the left chevron closes the hub and
  // opens the empty template-sync cascade page.
  const handleBackToSync = useCallback(() => {
    closeHub()
    router.push(TEMPLATE_SYNC_ROUTE)
  }, [closeHub, router])

  const value = useMemo<HubPanelContextValue>(
    () => ({
      openCascade,
      openForCreate,
      openForPropertyEdit,
      openForMcEdit,
      openForPropertyEditById,
      openForMcEditById,
    }),
    [
      openCascade,
      openForCreate,
      openForPropertyEdit,
      openForMcEdit,
      openForPropertyEditById,
      openForMcEditById,
    ],
  )

  return (
    <HubPanelContext.Provider value={value}>
      {children}
      <PropertyHubSidePanel
        controller={hubPanel}
        onOpenTemplate={handleOpenTemplate}
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
