"use client"

import { useCallback, useMemo, useState } from "react"
import type { UserToolRow } from "@/server/platform/tool-subscriptions"
import { orderFlooringNavItems, type FlooringNavItem } from "@/modules/app-shell/navigation/definitions"

export function useFlooringNavigationState({
  canUseTools,
  hasBuilderPanelAccess,
  tools,
  initialVisibleSlugs,
  initialOrderedSlugs,
}: {
  canUseTools: boolean
  hasBuilderPanelAccess: boolean
  tools: UserToolRow[]
  initialVisibleSlugs: string[]
  initialOrderedSlugs: string[]
}) {
  const [visibleSlugs, setVisibleSlugs] = useState(initialVisibleSlugs)
  const [orderedSlugs, setOrderedSlugs] = useState(initialOrderedSlugs)

  const orderedItems = useMemo(() => orderFlooringNavItems(orderedSlugs), [orderedSlugs])
  const visibleSlugSet = useMemo(() => new Set(visibleSlugs), [visibleSlugs])
  const unlockedToolSlugs = useMemo(() => tools.filter((tool) => tool.isUnlocked).map((tool) => tool.slug), [tools])
  const unlockedToolSet = useMemo(() => new Set(unlockedToolSlugs), [unlockedToolSlugs])
  const canOpenItem = useCallback(
    (item: FlooringNavItem) => {
      if (item.builderOnly) {
        return hasBuilderPanelAccess
      }

      return canUseTools || (item.requiredTool ? unlockedToolSet.has(item.requiredTool) : false)
    },
    [canUseTools, hasBuilderPanelAccess, unlockedToolSet],
  )

  return {
    visibleSlugs,
    setVisibleSlugs,
    orderedSlugs,
    setOrderedSlugs,
    orderedItems,
    visibleSlugSet,
    unlockedToolSlugs,
    unlockedToolSet,
    canOpenItem,
  }
}
