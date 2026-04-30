"use client"

import type { ReactNode } from "react"
import { StatusBadge } from "../badges/status-badge"
import type { HeaderAction } from "./contracts/header-action"
import type { HeaderStatus } from "./contracts/header-status"

const ACTION_KIND_CLASS_NAME: Record<NonNullable<HeaderAction["kind"]>, string> = {
  primary:
    "rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition hover:border-sky-500/45 disabled:cursor-not-allowed disabled:opacity-60",
  destructive:
    "rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60",
}

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type ActionHeaderProps = {
  title?: ReactNode
  /** Free-form summary slot — typically a row count or selection count. */
  summary?: ReactNode
  status?: HeaderStatus
  actions?: ReadonlyArray<HeaderAction>
  /**
   * Optional JSX rendered alongside the descriptor-driven `actions`, in the
   * same flex row. Use for action affordances whose state shape doesn't fit
   * the simple `HeaderAction` descriptor (e.g. a toggle whose label flips
   * with selection state). Renders BEFORE the descriptor actions.
   */
  extraActions?: ReactNode
  /**
   * Optional positive notice surface (info / success). Pass a string for the
   * default styled message block, or a fully-rendered ReactNode for custom
   * presentation. Renders above `error` so both can coexist.
   */
  message?: ReactNode
  /**
   * Optional error surface. Pass a string for the default styled error block,
   * or pass a fully-rendered ReactNode for custom presentation.
   */
  error?: ReactNode
  className?: string
}

/**
 * Action-driven section header: title + summary line + status badge + actions
 * + error slot. The role of the engine's `RecordSectionActionPanel`, but
 * decoupled from the engine's section tokens and without a baked-in surface
 * wrapper (consumer composes the surrounding panel).
 */
export function ActionHeader({ title, summary, status, actions, extraActions, message, error, className }: ActionHeaderProps) {
  return (
    <div
      className={joinClassNames(
        "flex flex-col gap-3 border-b border-[var(--panel-border)] px-4 py-3 lg:flex-row lg:items-start lg:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        {title ? (
          <div className="truncate text-base font-semibold text-[var(--foreground)]">{title}</div>
        ) : null}
        {status ? (
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            {status.detail ? (
              <span className="text-xs text-[var(--foreground)]/65">{status.detail}</span>
            ) : null}
          </div>
        ) : null}
        {summary ? (
          <div className="text-sm text-[var(--foreground)]/75">{summary}</div>
        ) : null}
        {message ? (
          typeof message === "string" ? (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800">
              {message}
            </div>
          ) : (
            message
          )
        ) : null}
        {error ? (
          typeof error === "string" ? (
            <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
              {error}
            </div>
          ) : (
            error
          )
        ) : null}
      </div>
      {extraActions || (actions && actions.length > 0) ? (
        <div className="flex shrink-0 items-center gap-2">
          {extraActions}
          {actions?.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              aria-label={action.ariaLabel ?? action.label}
              className={ACTION_KIND_CLASS_NAME[action.kind ?? "primary"]}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
