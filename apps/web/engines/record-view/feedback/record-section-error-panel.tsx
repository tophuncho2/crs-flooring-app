"use client"

import type { ReactNode } from "react"
import { joinRecordSectionClasses } from "../sections/structure/record-section-tokens"
import type { RecordSectionError } from "@/types/record/section-error"

function readSectionErrorToneClassName(kind: RecordSectionError["kind"]) {
  if (kind === "validation") {
    return "border-amber-500/35 bg-amber-500/10 text-amber-900"
  }

  if (kind === "conflict" || kind === "stale-revision") {
    return "border-rose-500/35 bg-rose-500/10 text-rose-900"
  }

  if (kind === "workflow") {
    return "border-blue-500/35 bg-blue-500/10 text-blue-900"
  }

  if (kind === "allocation-invariant") {
    return "border-orange-500/35 bg-orange-500/10 text-orange-950"
  }

  return "border-rose-500/35 bg-rose-500/10 text-rose-900"
}

function readSectionErrorTitle(kind: RecordSectionError["kind"]) {
  if (kind === "validation") return "Fix required"
  if (kind === "conflict") return "Conflict"
  if (kind === "stale-revision") return "Out of date"
  if (kind === "workflow") return "Workflow blocked"
  if (kind === "allocation-invariant") return "Allocation error"
  return "Section error"
}

export function RecordSectionErrorPanel({
  error,
  actions,
  className,
}: {
  error: RecordSectionError
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={joinRecordSectionClasses(
        "rounded-xl border px-3 py-3 text-sm",
        readSectionErrorToneClassName(error.kind),
        className,
      )}
    >
      <div className="font-semibold">{readSectionErrorTitle(error.kind)}</div>
      <div className="mt-1">{error.message}</div>
      {error.description ? <div className="mt-1 text-[13px] opacity-80">{error.description}</div> : null}
      {actions ? <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div> : null}
      {error.requestId ? <div className="mt-2 text-[11px] uppercase tracking-[0.12em] opacity-65">Request {error.requestId}</div> : null}
    </div>
  )
}
