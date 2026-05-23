"use client"

import type { ReactNode } from "react"

export type HubSidePanelScopedRowProps = {
  primary: ReactNode
  secondary?: ReactNode
  meta?: ReactNode
  onClick: () => void
  ariaLabel?: string
  /**
   * Optional trailing action(s), revealed on row hover / keyboard focus.
   * Rendered as a sibling of the main button (interactive elements can't
   * nest) and overlaid on a reserved right gutter, so the row layout never
   * shifts when it fades in. Pass a fragment of buttons to stack several.
   */
  action?: ReactNode
}

const WRAPPER_CLASS_NAME =
  "group relative border-t border-blue-500/40 transition first:border-t-0 hover:bg-[var(--panel-hover)]"

const BUTTON_CLASS_NAME =
  "grid w-full grid-cols-[1fr_auto] items-start gap-3 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"

// Right padding reserved on the main button when an action is present, so
// the overlaid action gutter never sits on top of the row's text.
const BUTTON_ACTION_RESERVE = "pr-12"

/**
 * Clickable row inside a hub-panel scoped list (paginated properties,
 * paginated templates). Lifted from the existing hub-view row layout so
 * every list in the hub family looks identical. Selecting a row replaces
 * the panel's active section — the consumer routes the click into the
 * controller's mode transition. An optional {@link HubSidePanelScopedRowProps.action}
 * adds hover-revealed trailing controls without disturbing that primary click.
 */
export function HubSidePanelScopedRow({
  primary,
  secondary,
  meta,
  onClick,
  ariaLabel,
  action,
}: HubSidePanelScopedRowProps) {
  return (
    <div className={WRAPPER_CLASS_NAME}>
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={action ? `${BUTTON_CLASS_NAME} ${BUTTON_ACTION_RESERVE}` : BUTTON_CLASS_NAME}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm text-[var(--foreground)]/85">{primary}</span>
          {secondary ? (
            <span className="truncate text-xs text-[var(--foreground)]/55">{secondary}</span>
          ) : null}
        </div>
        {meta ? (
          <span className="shrink-0 border-l border-blue-500/40 pl-3 text-xs tabular-nums text-[var(--foreground)]/70">
            {meta}
          </span>
        ) : null}
      </button>
      {action ? (
        <div className="absolute inset-y-0 right-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {action}
        </div>
      ) : null}
    </div>
  )
}

export type HubSidePanelScopedListProps = {
  title: string
  total: number
  emptyMessage?: string
  isError?: boolean
  errorMessage?: string
  loadingMessage?: string
  hasData: boolean
  children: ReactNode
}

const GRID_BORDER = "border-blue-500/40"
const EMPTY_CELL = "—"

/**
 * Card-with-tab container for a scoped list inside the hub panel.
 * Renders the tab + bordered grid identical to the hub-view styling. The
 * consumer renders {@link HubSidePanelScopedRow} children inside.
 */
export function HubSidePanelScopedList({
  title,
  total,
  emptyMessage = EMPTY_CELL,
  isError,
  errorMessage = "Could not load.",
  loadingMessage = "Loading…",
  hasData,
  children,
}: HubSidePanelScopedListProps) {
  if (!hasData) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/65">
          {title}
        </div>
        <p className="text-xs text-[var(--foreground)]/55">
          {isError ? errorMessage : loadingMessage}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div>
        <span
          className={`inline-block rounded-t-md border border-b-0 ${GRID_BORDER} bg-blue-500/15 px-3 py-1 text-xs font-bold text-[var(--foreground)]/85`}
        >
          {title} ({total})
        </span>
      </div>
      <div className={`overflow-hidden rounded-md rounded-tl-none border ${GRID_BORDER}`}>
        {total === 0 ? (
          <div className="px-3 py-2 text-xs text-[var(--foreground)]/55">{emptyMessage}</div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
