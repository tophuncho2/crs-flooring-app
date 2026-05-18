"use client"

import type { ReactNode } from "react"

export type SidePanelEditStatusBadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "error"
  | "processing"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

/**
 * Single tone-coded pill primitive. Side-panel-edit flavor of the
 * record-view status badge; lives here so the side-panel-edit world does
 * not reach into the record-view package for chrome.
 */
export function SidePanelEditStatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode
  tone?: SidePanelEditStatusBadgeTone
  className?: string
}) {
  const toneClassName =
    tone === "success"
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700"
      : tone === "warning"
        ? "border-amber-500/35 bg-amber-500/10 text-amber-800"
        : tone === "error"
          ? "border-rose-500/35 bg-rose-500/10 text-rose-800"
          : tone === "processing"
            ? "border-blue-500/35 bg-blue-500/10 text-blue-800"
            : "border-[var(--panel-border)] bg-transparent text-[var(--foreground)]/75"

  return (
    <span
      className={joinClasses(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
        toneClassName,
        className,
      )}
    >
      {children}
    </span>
  )
}

export type SidePanelEditStatusPillProps = {
  isDirty: boolean
  isSaving: boolean
  hasConflict?: boolean
  extra?: ReactNode
}

/**
 * Composite save-state indicator: a tone-coded `Saved` / `Dirty` / `Saving`
 * pill, plus a separate `Conflict` pill when an optimistic-lock collision
 * is in flight. Consumers pass dirty/saving/conflict state from their
 * controller; layout chrome (gap / wrap) belongs to the consumer.
 */
export function SidePanelEditStatusPill({
  isDirty,
  isSaving,
  hasConflict = false,
  extra,
}: SidePanelEditStatusPillProps) {
  return (
    <>
      <SidePanelEditStatusBadge tone={isSaving ? "processing" : isDirty ? "warning" : "success"}>
        {isSaving ? "Saving" : isDirty ? "Dirty" : "Saved"}
      </SidePanelEditStatusBadge>
      {hasConflict ? <SidePanelEditStatusBadge tone="error">Conflict</SidePanelEditStatusBadge> : null}
      {extra}
    </>
  )
}
