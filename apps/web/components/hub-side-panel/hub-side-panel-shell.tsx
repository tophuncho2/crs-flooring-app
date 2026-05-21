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
  children,
}: HubSidePanelShellProps) {
  return (
    <SidePanelPreview
      open={open}
      side="right"
      onClose={onClose}
      title={title}
      ariaLabel={ariaLabel}
      widthClassName={HUB_PANEL_WIDTH_CLASS}
      stickyHeader={topToolbar}
    >
      {children}
    </SidePanelPreview>
  )
}
