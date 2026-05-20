"use client"

import { useCallback, useEffect, useState } from "react"
import {
  usePropertyHubViewDetailQuery,
  usePropertyHubViewPropertiesQuery,
  usePropertyHubViewTemplatesQuery,
  type PropertyHubViewPropertiesController,
  type PropertyHubViewTemplatesController,
} from "./queries"
import type { PropertyHubViewOpenSpec } from "./types"

export type PropertyHubViewActiveView = "properties" | "templates"

/**
 * Owns the read-only Hub View side panel: composes the management-company
 * detail query, the paginated properties query, and the paginated templates
 * query for a given MC. Also owns view state (properties ↔ templates),
 * the optional property filter applied to the templates view, and the
 * inline property-filter picker expansion flag. The list client wires the
 * row-click handlers externally — the view panel does not know about the
 * property side panel or the future template preview.
 *
 * View state, filter state, and both list paginations persist across view
 * toggles (no resets on toggle). All cross-view state resets when the
 * panel is opened with a different management company.
 */
export function usePropertyHubViewSidePanel() {
  const [openSpec, setOpenSpec] = useState<PropertyHubViewOpenSpec | null>(null)
  const managementCompanyId = openSpec?.managementCompanyId ?? null

  const [activeView, setActiveView] = useState<PropertyHubViewActiveView>("properties")
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [selectedPropertyLabel, setSelectedPropertyLabel] = useState<string | null>(null)
  const [propertyFilterExpanded, setPropertyFilterExpanded] = useState(false)

  // Cross-cutting reset on MC change: collapse picker, drop filter, and bounce
  // back to the properties view. The per-list pagination resets live in each
  // list's own query hook.
  useEffect(() => {
    setActiveView("properties")
    setSelectedPropertyId(null)
    setSelectedPropertyLabel(null)
    setPropertyFilterExpanded(false)
  }, [managementCompanyId])

  const detailQuery = usePropertyHubViewDetailQuery(managementCompanyId)
  const properties: PropertyHubViewPropertiesController =
    usePropertyHubViewPropertiesQuery(managementCompanyId)
  const templates: PropertyHubViewTemplatesController = usePropertyHubViewTemplatesQuery(
    managementCompanyId,
    selectedPropertyId,
  )

  const open = useCallback((id: string) => {
    setOpenSpec({ managementCompanyId: id })
  }, [])

  const close = useCallback(() => {
    setOpenSpec(null)
  }, [])

  const goToProperties = useCallback(() => {
    setActiveView("properties")
    setPropertyFilterExpanded(false)
  }, [])

  const goToTemplates = useCallback(() => {
    setActiveView("templates")
  }, [])

  const togglePropertyFilter = useCallback(() => {
    setPropertyFilterExpanded((value) => !value)
  }, [])

  const cancelPropertyFilter = useCallback(() => {
    setPropertyFilterExpanded(false)
  }, [])

  const selectPropertyFilter = useCallback((id: string, label: string) => {
    setSelectedPropertyId(id)
    setSelectedPropertyLabel(label)
    setPropertyFilterExpanded(false)
  }, [])

  const clearPropertyFilter = useCallback(() => {
    setSelectedPropertyId(null)
    setSelectedPropertyLabel(null)
    setPropertyFilterExpanded(false)
  }, [])

  return {
    isOpen: openSpec !== null,
    managementCompanyId,
    managementCompany: detailQuery.data ?? null,
    isLoadingDetail: detailQuery.isPending && managementCompanyId !== null,
    isErrorDetail: detailQuery.isError,
    properties,
    templates,
    activeView,
    selectedPropertyId,
    selectedPropertyLabel,
    propertyFilterExpanded,
    open,
    close,
    goToProperties,
    goToTemplates,
    togglePropertyFilter,
    cancelPropertyFilter,
    selectPropertyFilter,
    clearPropertyFilter,
  }
}

export type PropertyHubViewSidePanelController = ReturnType<typeof usePropertyHubViewSidePanel>
