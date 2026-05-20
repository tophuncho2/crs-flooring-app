"use client"

import { useCallback, useState } from "react"
import {
  usePropertyHubViewDetailQuery,
  usePropertyHubViewPropertiesQuery,
  type PropertyHubViewPropertiesController,
} from "./queries"
import type { PropertyHubViewOpenSpec } from "./types"

/**
 * Owns the read-only Hub View side panel: composes the management-company
 * detail query and the paginated properties query for a given MC. The list
 * client wires the row-click handler externally (the view panel does not
 * know about the property side panel).
 */
export function usePropertyHubViewSidePanel() {
  const [openSpec, setOpenSpec] = useState<PropertyHubViewOpenSpec | null>(null)
  const managementCompanyId = openSpec?.managementCompanyId ?? null

  const detailQuery = usePropertyHubViewDetailQuery(managementCompanyId)
  const properties: PropertyHubViewPropertiesController =
    usePropertyHubViewPropertiesQuery(managementCompanyId)

  const open = useCallback((id: string) => {
    setOpenSpec({ managementCompanyId: id })
  }, [])

  const close = useCallback(() => {
    setOpenSpec(null)
  }, [])

  return {
    isOpen: openSpec !== null,
    managementCompanyId,
    managementCompany: detailQuery.data ?? null,
    isLoadingDetail: detailQuery.isPending && managementCompanyId !== null,
    isErrorDetail: detailQuery.isError,
    properties,
    open,
    close,
  }
}

export type PropertyHubViewSidePanelController = ReturnType<typeof usePropertyHubViewSidePanel>
