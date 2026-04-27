"use client"

import type { UserToolRow } from "@/server/platform/tool-access"
import NavDrawerButton from "./nav-drawer-button"
import FlooringToolsMenu from "./tools-menu"
import UserMenu from "./user-menu"
import { useFlooringNavigationState } from "../hooks/use-navigation-state"

type HeaderControlsProps = {
  email: string
  role: string
  canUseTools: boolean
  tools: UserToolRow[]
  initialVisibleFlooringSlugs: string[]
  initialOrderedFlooringSlugs: string[]
}

export type { HeaderControlsProps }

export default function HeaderControls({
  email,
  role,
  canUseTools,
  tools,
  initialVisibleFlooringSlugs,
  initialOrderedFlooringSlugs,
}: HeaderControlsProps) {
  const hasAdminPanelAccess = role === "ADMIN" || role === "OWNER"
  const navigation = useFlooringNavigationState({
    canUseTools,
    hasAdminPanelAccess,
    tools,
    initialVisibleSlugs: initialVisibleFlooringSlugs,
    initialOrderedSlugs: initialOrderedFlooringSlugs,
  })

  return (
    <div className="flex w-full max-w-full items-center justify-between gap-2 sm:gap-4">
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <NavDrawerButton
          canUseTools={canUseTools}
          hasAdminPanelAccess={hasAdminPanelAccess}
          orderedItems={navigation.orderedItems}
          visibleSlugSet={navigation.visibleSlugSet}
          canOpenItem={navigation.canOpenItem}
        />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
        <FlooringToolsMenu
          canUseTools={canUseTools}
          hasAdminPanelAccess={hasAdminPanelAccess}
          visibleSlugs={navigation.visibleSlugs}
          orderedItems={navigation.orderedItems}
          canOpenItem={navigation.canOpenItem}
          onVisibleSlugsChange={navigation.setVisibleSlugs}
          onOrderedSlugsChange={navigation.setOrderedSlugs}
        />
        <UserMenu
          email={email}
          role={role}
          canUseTools={canUseTools}
          unlockedToolSlugs={navigation.unlockedToolSlugs}
        />
      </div>
    </div>
  )
}
