"use client"

import { useState } from "react"
import type { UserToolRow } from "@/server/platform/tool-subscriptions"
import FlooringHeaderNav from "./flooring-header-nav"
import FlooringToolsMenu from "./flooring-tools-menu"
import UserMenu from "./user-menu"
import { orderFlooringNavItems } from "./flooring-navigation"

type HeaderControlsProps = {
  email: string
  role: string
  canUseTools: boolean
  tools: UserToolRow[]
  initialVisibleFlooringSlugs: string[]
  initialOrderedFlooringSlugs: string[]
}

export default function HeaderControls({
  email,
  role,
  canUseTools,
  tools,
  initialVisibleFlooringSlugs,
  initialOrderedFlooringSlugs,
}: HeaderControlsProps) {
  const [visibleFlooringSlugs, setVisibleFlooringSlugs] = useState(initialVisibleFlooringSlugs)
  const [orderedFlooringSlugs, setOrderedFlooringSlugs] = useState(initialOrderedFlooringSlugs)
  const orderedItems = orderFlooringNavItems(orderedFlooringSlugs)

  return (
    <div className="flex w-full max-w-full items-center justify-between gap-2 sm:gap-4">
      <div className="min-w-0 flex-1">
        <FlooringHeaderNav canUseTools={canUseTools} tools={tools} visibleSlugs={visibleFlooringSlugs} orderedItems={orderedItems} />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
        <>
          <FlooringToolsMenu
            canUseTools={canUseTools}
            tools={tools}
            visibleSlugs={visibleFlooringSlugs}
            orderedItems={orderedItems}
            onVisibleSlugsChange={setVisibleFlooringSlugs}
            onOrderedSlugsChange={setOrderedFlooringSlugs}
          />
          <UserMenu
            email={email}
            role={role}
            canUseTools={canUseTools}
            unlockedToolSlugs={tools.filter((tool) => tool.isUnlocked).map((tool) => tool.slug)}
          />
        </>
      </div>
    </div>
  )
}
