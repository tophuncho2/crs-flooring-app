"use client"

import { type ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

type SharedButtonProps = {
  children?: ReactNode
  onClick: () => void
  disabled?: boolean
  className?: string
}

export function OpenRowButton({ children = "Open", onClick, disabled, className }: SharedButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={joinClasses(
        "rounded border border-[var(--panel-border)] px-3 py-1 text-xs hover:bg-[var(--panel-hover)] disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  )
}

export function SaveRowButton({ children = "Save", onClick, disabled, className }: SharedButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={joinClasses(
        "rounded border border-[var(--panel-border)] px-3 py-1 text-xs hover:bg-[var(--panel-hover)] disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  )
}

export function DeleteRowButton({ children = "Delete", onClick, disabled, className }: SharedButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={joinClasses(
        "rounded border border-rose-500/40 px-3 py-1 text-xs text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  )
}
