"use client"

import { useState, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { AnchoredPanel } from "@/engines/common"
import {
  TOOLBAR_TRIGGER_ACTIVE,
  TOOLBAR_TRIGGER_BASE,
  TOOLBAR_TRIGGER_INACTIVE,
} from "./toolbar-button-styles"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type ToolbarMenuButtonProps = {
  /** Trigger label (e.g. "Search", "Filter", "Sort"). */
  label: string
  /** Optional leading lucide icon. */
  icon?: LucideIcon
  /** Lights the trigger + shows the active dot when the tool is narrowing the view. */
  active?: boolean
  /** Trigger aria-label; defaults to `label`. */
  ariaLabel?: string
  /** Sticky header content for the popover; defaults to `label`. */
  title?: ReactNode
  /**
   * Width class for the menu body wrapper. The engine owns the body layout
   * (`flex flex-col gap-2`) so consumers just drop controls in; override only
   * the width (defaults to `w-[15rem]`) when a body needs to be wider.
   */
  bodyClassName?: string
  /**
   * Height cap (px) for the popover before its body scrolls. Defaults to the
   * `AnchoredPanel` default (400); raise it for a tall tool (e.g. the export
   * menu's column picker) so its footer button stays in view without scrolling.
   */
  maxHeight?: number
  /** The menu body controls (search/filter/sort) — wrapped by the engine. */
  children: ReactNode
}

/**
 * One right-cluster toolbar tool: a bordered trigger button that opens its own
 * {@link AnchoredPanel} popover, so every tool stays directly visible (no drill
 * into a shared menu). Owns its open state; the popover anchors to the trigger
 * and flips above when space is tight. Pure chrome — the consumer composes the
 * menu body from the engine's search/filter/sort controls.
 */
export function ToolbarMenuButton({
  label,
  icon: Icon,
  active = false,
  ariaLabel,
  title,
  bodyClassName,
  maxHeight,
  children,
}: ToolbarMenuButtonProps) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <AnchoredPanel
      open={open}
      onClose={close}
      align="right"
      maxHeight={maxHeight}
      stickyHeader={
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--foreground)]/70">
          {title ?? label}
        </span>
      }
      trigger={
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={ariaLabel ?? label}
          className={joinClassNames(
            TOOLBAR_TRIGGER_BASE,
            active ? TOOLBAR_TRIGGER_ACTIVE : TOOLBAR_TRIGGER_INACTIVE,
          )}
        >
          {Icon ? <Icon size={14} strokeWidth={2.5} aria-hidden="true" /> : null}
          {label}
        </button>
      }
    >
      <div className={joinClassNames("flex flex-col gap-2", bodyClassName ?? "w-[15rem]")}>
        {children}
      </div>
    </AnchoredPanel>
  )
}
