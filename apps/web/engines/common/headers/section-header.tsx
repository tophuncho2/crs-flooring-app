"use client"

import type { ReactNode } from "react"
import type { HeaderAction } from "./contracts/header-action"

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

export type SectionHeaderProps = {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReadonlyArray<HeaderAction>
  className?: string
}

/**
 * Plain section header: title + optional subtitle + optional action buttons
 * on the right. No status surface, no error rendering — those belong to
 * `ActionHeader` for action-driven sections.
 */
export function SectionHeader({ title, subtitle, actions, className }: SectionHeaderProps) {
  return (
    <header
      className={joinClassNames(
        "flex items-start justify-between gap-3 border-b border-[var(--panel-border)] px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="truncate text-base font-semibold text-[var(--foreground)]">{title}</div>
        {subtitle ? (
          <div className="mt-0.5 truncate text-xs text-[var(--foreground)]/65">{subtitle}</div>
        ) : null}
      </div>
      {actions && actions.length > 0 ? (
        <div className="flex shrink-0 items-center gap-2">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              aria-label={action.ariaLabel ?? action.label}
              className={ACTION_KIND_CLASS_NAME[action.kind ?? "secondary"]}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </header>
  )
}
