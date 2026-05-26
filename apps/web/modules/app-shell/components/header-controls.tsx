"use client"

import NavDrawerButton from "./nav-drawer-button"
import UserMenu from "./user-menu"
import { InventoryHubButton } from "./inventory-hub-button"
import { TemplateSyncButton } from "@/modules/template-sync/components/template-sync-button"
import { FLOORING_NAV_ITEMS } from "@/modules/app-shell/navigation/definitions"

type HeaderControlsProps = {
  email: string
  role: string
}

export type { HeaderControlsProps }

export default function HeaderControls({ email, role }: HeaderControlsProps) {
  return (
    <div className="flex w-full max-w-full items-center justify-between gap-2 sm:gap-4">
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <NavDrawerButton orderedItems={FLOORING_NAV_ITEMS} />
        <div id="record-back-button-slot" className="contents" />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
        <InventoryHubButton />
        <TemplateSyncButton />
        <UserMenu email={email} role={role} />
      </div>
    </div>
  )
}
