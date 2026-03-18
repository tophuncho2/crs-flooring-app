"use client"

import type { ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function CenteredLoadingState({
  label = "Loading...",
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div className={joinClasses("flex min-h-[240px] items-center justify-center px-4 py-10", className)}>
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--subpanel-background)] px-5 py-4 text-sm text-[var(--foreground)]/75 shadow-sm">
        {label}
      </div>
    </div>
  )
}

export function CenteredErrorState({
  title = "Error",
  message,
  dismissLabel = "Close",
  onDismiss,
  className,
}: {
  title?: string
  message: ReactNode
  dismissLabel?: string
  onDismiss?: () => void
  className?: string
}) {
  const content = (
    <div
      className={joinClasses(
        "w-full max-w-xl rounded-2xl border border-rose-500/40 bg-rose-500/10 px-6 py-5 text-center shadow-[0_20px_48px_rgba(0,0,0,0.25)]",
        className,
      )}
    >
      <h2 className="text-lg font-semibold text-rose-600">{title}</h2>
      <div className="mt-2 text-sm text-rose-700">{message}</div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="mt-4 rounded border border-rose-500/40 px-4 py-2 text-sm text-rose-700 hover:bg-rose-500/10"
        >
          {dismissLabel}
        </button>
      ) : null}
    </div>
  )

  if (!onDismiss) {
    return <div className="flex min-h-[280px] items-center justify-center px-4 py-10">{content}</div>
  }

  return (
    <button
      type="button"
      onClick={onDismiss}
      className="flex min-h-[280px] w-full items-center justify-center bg-transparent px-4 py-10 text-left"
    >
      {content}
    </button>
  )
}
