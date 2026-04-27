"use client"

import type { UserToolRow } from "@/server/platform/tool-access"
import NavDrawerButton from "./nav-drawer-button"
import UserMenu from "./user-menu"
import { TemplateSyncButton } from "@/modules/template-sync/components/template-sync-button"
import { useFlooringNavigationState } from "../hooks/use-navigation-state"

type HeaderControlsProps = {
  email: string
  role: string
  canUseTools: boolean
  tools: UserToolRow[]
}

export type { HeaderControlsProps }

export default function HeaderControls({
  email,
  role,
  canUseTools,
  tools,
}: HeaderControlsProps) {
  const hasAdminPanelAccess = role === "ADMIN" || role === "OWNER"
  const navigation = useFlooringNavigationState({
    canUseTools,
    hasAdminPanelAccess,
    tools,
  })

  return (
    <div className="flex w-full max-w-full items-center justify-between gap-2 sm:gap-4">
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <NavDrawerButton
          canUseTools={canUseTools}
          hasAdminPanelAccess={hasAdminPanelAccess}
          orderedItems={navigation.orderedItems}
          canOpenItem={navigation.canOpenItem}
        />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
        <TemplateSyncButton />
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
