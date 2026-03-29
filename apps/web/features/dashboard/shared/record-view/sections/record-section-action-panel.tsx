"use client"

import type { ReactNode } from "react"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
  RECORD_SECTION_BORDER_CLASS_NAME,
  RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
} from "@/features/dashboard/shared/record-view/sections/record-section-tokens"

export function RecordSectionStatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode
  tone?: "neutral" | "success" | "warning" | "error" | "processing"
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
      className={joinRecordSectionClasses(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
        toneClassName,
        className,
      )}
    >
      {children}
    </span>
  )
}

export function RecordSectionActionPanel({
  summary,
  status,
  actions,
  error,
  className,
}: {
  summary?: ReactNode
  status?: ReactNode
  actions?: ReactNode
  error?: ReactNode
  className?: string
}) {
  return (
    <div
      className={joinRecordSectionClasses(
        "px-5 py-4",
        RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          {status ? <div className="flex flex-wrap items-center gap-2">{status}</div> : null}
          {summary ? (
            <div
              className={joinRecordSectionClasses(
                "rounded-xl border px-3 py-2 text-sm text-[var(--foreground)]/75",
                RECORD_SECTION_BORDER_CLASS_NAME,
                RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
              )}
            >
              {summary}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
              {error}
            </div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
      </div>
    </div>
  )
}
