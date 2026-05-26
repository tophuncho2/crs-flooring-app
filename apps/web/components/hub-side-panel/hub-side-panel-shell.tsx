"use client"

import type { ReactNode } from "react"
import { SidePanelPreview } from "@/components/side-panel-preview"

export type HubSidePanelShellProps = {
  open: boolean
  onClose: () => void
  title: ReactNode
  ariaLabel?: string
  /**
   * Top toolbar rendered in the sticky header. Composes view + edit toolbars,
   * pagination, picker triggers. All hub modes use the top toolbar slot; the
   * bottom footer of SidePanelPreview is intentionally unused.
   */
  topToolbar?: ReactNode
  /**
   * Optional action rendered in the title row, immediately left of the close
   * (X) button. Used for the always-available "+ Hub" affordance shared by
   * every panel connected to the property hub.
   */
  titleEnd?: ReactNode
  children: ReactNode
}

const HUB_PANEL_WIDTH_CLASS = "w-[48rem]"

/**
 * Shared shell for every hub-panel mode (view / create / section-edit /
 * picker-takeover). Locks the canonical width and exposes a single top
 * toolbar slot — modes swap their toolbar contents (view switcher +
 * pagination vs Save / Discard / Delete + status pill). No footer.
 */
export function HubSidePanelShell({
  open,
  onClose,
  title,
  ariaLabel,
  topToolbar,
  titleEnd,
  children,
}: HubSidePanelShellProps) {
  return (
    <SidePanelPreview
      open={open}
      side="right"
      onClose={onClose}
      title={title}
      ariaLabel={ariaLabel}
      titleEnd={titleEnd}
      widthClassName={HUB_PANEL_WIDTH_CLASS}
      stickyHeader={topToolbar}
    >
      {children}
    </SidePanelPreview>
  )
}
