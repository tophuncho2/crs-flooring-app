"use client"

import type { ReactNode } from "react"

export type HubSidePanelSectionState = "view" | "edit" | "disabled"

export type HubSidePanelSectionProps = {
  /** Section heading. */
  title: ReactNode
  /** view = readonly preview, edit = inline form cells, disabled = grayed. */
  state: HubSidePanelSectionState
  /**
   * Fired when the user clicks the section header / body while in `view`.
   * Consumer transitions the hub panel into edit mode for this section.
   */
  onEnterEdit?: () => void
  children: ReactNode
}

const TITLE_CLASS_NAME =
  "text-xs font-semibold uppercase tracking-wide text-[var(--panel-foreground-muted,_var(--foreground))]/65"

const VIEW_BODY_CLASS_NAME =
  "cursor-pointer rounded-md border border-transparent p-2 transition hover:border-blue-500/40 hover:bg-blue-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"

const EDIT_BODY_CLASS_NAME = "rounded-md p-1"

const DISABLED_BODY_CLASS_NAME =
  "rounded-md p-2 opacity-50 pointer-events-none select-none"

/**
 * Section container for the hub side panel. Three states:
 *  - view: readonly preview; the whole body is a button that fires
 *    `onEnterEdit` to swap the panel into edit mode for this section.
 *  - edit: inline form cells; consumer renders the editable cells; no click
 *    behavior here (the panel's top toolbar handles save/discard/delete).
 *  - disabled: dimmed + pointer-events disabled while another section owns
 *    the edit toolbar.
 */
export function HubSidePanelSection({
  title,
  state,
  onEnterEdit,
  children,
}: HubSidePanelSectionProps) {
  if (state === "view") {
    return (
      <section className="flex flex-col gap-2">
        <div className={TITLE_CLASS_NAME}>{title}</div>
        <button
          type="button"
          onClick={onEnterEdit}
          aria-label={`Edit ${typeof title === "string" ? title : "section"}`}
          className={`${VIEW_BODY_CLASS_NAME} text-left w-full`}
        >
          {children}
        </button>
      </section>
    )
  }

  if (state === "disabled") {
    return (
      <section className="flex flex-col gap-2">
        <div className={TITLE_CLASS_NAME}>{title}</div>
        <div className={DISABLED_BODY_CLASS_NAME}>{children}</div>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-2">
      <div className={TITLE_CLASS_NAME}>{title}</div>
      <div className={EDIT_BODY_CLASS_NAME}>{children}</div>
    </section>
  )
}
