"use client"

import { useState } from "react"
import type { UserToolRow } from "@/lib/tool-subscriptions"
import FlooringHeaderNav from "./flooring-header-nav"
import FlooringToolsMenu from "./flooring-tools-menu"
import UserMenu from "./user-menu"

type HeaderControlsProps = {
  email: string
  role: string
  canUseTools: boolean
  tools: UserToolRow[]
  initialVisibleFlooringSlugs: string[]
}

export default function HeaderControls({
  email,
  role,
  canUseTools,
  tools,
  initialVisibleFlooringSlugs,
}: HeaderControlsProps) {
  const [visibleFlooringSlugs, setVisibleFlooringSlugs] = useState(initialVisibleFlooringSlugs)

  return (
    <div className="ml-auto flex w-fit max-w-full items-center gap-2 sm:gap-4">
      <FlooringHeaderNav canUseTools={canUseTools} tools={tools} visibleSlugs={visibleFlooringSlugs} />
      <FlooringToolsMenu
        canUseTools={canUseTools}
        tools={tools}
        visibleSlugs={visibleFlooringSlugs}
        onVisibleSlugsChange={setVisibleFlooringSlugs}
      />
      <UserMenu
        email={email}
        role={role}
        canUseTools={canUseTools}
        unlockedToolSlugs={tools.filter((tool) => tool.isUnlocked).map((tool) => tool.slug)}
      />
    </div>
  )
}
