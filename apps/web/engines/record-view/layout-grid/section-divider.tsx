"use client"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type RecordSectionDividerProps = {
  className?: string
}

/**
 * A horizontal section terminator — the canonical panel-border line that closes
 * one record-view section before the next band (e.g. the read-only footer).
 * Replaces ad-hoc inline `border-t` divs so the tone stays consistent.
 */
export function RecordSectionDivider({ className }: RecordSectionDividerProps) {
  return <div className={joinClassNames("border-t border-[var(--panel-border)]", className)} />
}
