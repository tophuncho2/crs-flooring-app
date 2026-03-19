"use client"

import { useCallback, useMemo, useState } from "react"
import type { UserToolRow } from "@/server/platform/tool-subscriptions"
import { FLOORING_HOTKEYS } from "@/server/flooring/hotkeys"
import { orderFlooringNavItems, type FlooringNavItem } from "./flooring-navigation"

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
  const hotkeyByPath = useMemo(
    () => new Map(FLOORING_HOTKEYS.filter((hotkey) => hotkey.path).map((hotkey) => [hotkey.path!, hotkey.combination])),
    [],
  )

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
    hotkeyByPath,
    canOpenItem,
  }
}
