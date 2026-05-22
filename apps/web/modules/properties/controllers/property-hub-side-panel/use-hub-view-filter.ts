"use client"

import { useCallback, useEffect, useState } from "react"
import type { HubActiveView } from "./types"

export type UseHubViewFilterArgs = {
  /** The current hub's MC id (or null when closed / orphan). Changes trigger auto-reset. */
  contextMcId: string | null
}

export type HubViewFilterSlice = {
  activeView: HubActiveView
  selectedPropertyId: string | null
  selectedPropertyLabel: string | null
  setPropertyFilter: (id: string, label: string) => void
  clearPropertyFilter: () => void
  resetView: () => void
}

/**
 * View-mode auxiliary slice. Owns the property-filter chip state (used in
 * the templates tab) and the auto-reset effect that fires when the hub's
 * context MC changes (so filters from one hub don't bleed into another).
 */
export function useHubViewFilter({ contextMcId }: UseHubViewFilterArgs): HubViewFilterSlice {
  const [activeView, setActiveView] = useState<HubActiveView>("properties")
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [selectedPropertyLabel, setSelectedPropertyLabel] = useState<string | null>(null)

  const resetView = useCallback(() => {
    setActiveView("properties")
    setSelectedPropertyId(null)
    setSelectedPropertyLabel(null)
  }, [])

  const setPropertyFilter = useCallback((id: string, label: string) => {
    setSelectedPropertyId(id)
    setSelectedPropertyLabel(label)
  }, [])

  const clearPropertyFilter = useCallback(() => {
    setSelectedPropertyId(null)
    setSelectedPropertyLabel(null)
  }, [])

  // Reset when context MC changes — so filters from one hub don't leak to another.
  useEffect(() => {
    resetView()
  }, [contextMcId, resetView])

  return {
    activeView,
    selectedPropertyId,
    selectedPropertyLabel,
    setPropertyFilter,
    clearPropertyFilter,
    resetView,
  }
}
