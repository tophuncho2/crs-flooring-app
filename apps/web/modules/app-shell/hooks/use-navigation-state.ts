"use client"

import { useCallback, useMemo } from "react"
import type { UserToolRow } from "@/server/platform/tool-access"
import { FLOORING_NAV_ITEMS, type FlooringNavItem } from "@/modules/app-shell/navigation/definitions"

export function useFlooringNavigationState({
  canUseTools,
  tools,
}: {
  canUseTools: boolean
  tools: UserToolRow[]
}) {
  const orderedItems = useMemo(() => FLOORING_NAV_ITEMS, [])
  const unlockedToolSlugs = useMemo(() => tools.filter((tool) => tool.isUnlocked).map((tool) => tool.slug), [tools])
  const unlockedToolSet = useMemo(() => new Set(unlockedToolSlugs), [unlockedToolSlugs])
  const canOpenItem = useCallback(
    (item: FlooringNavItem) => {
      return canUseTools || (item.requiredTool ? unlockedToolSet.has(item.requiredTool) : false)
    },
    [canUseTools, unlockedToolSet],
  )

  return {
    orderedItems,
    unlockedToolSlugs,
    unlockedToolSet,
    canOpenItem,
  }
}
