"use client"

import { useCallback } from "react"
import type { PropertyListRow } from "@builders/domain"
import {
  usePropertySidePanel,
  type PropertySidePanelController,
} from "@/modules/properties/controllers/use-property-side-panel"

/**
 * Owns the properties-section state for the management-company hub view:
 * a property side-panel controller (shared with the property list view's
 * panel) plus the row-click handler that opens it in edit mode.
 *
 * Page state + the react-query for the filtered properties list live in
 * the section component itself, mirroring how `InventoryCutLogsSection`
 * owns its own pagination.
 */
export function useManagementCompanyPropertiesSection() {
  const panel = usePropertySidePanel()

  const onOpenProperty = useCallback(
    (row: PropertyListRow) => {
      panel.openPanel({ mode: "edit", row })
    },
    [panel],
  )

  return { panel, onOpenProperty }
}

export type ManagementCompanyPropertiesSectionController = {
  panel: PropertySidePanelController
  onOpenProperty: (row: PropertyListRow) => void
}
