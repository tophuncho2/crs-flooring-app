"use client"

import type { ReactNode } from "react"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"
import type { RecordSectionError } from "@/types/record/section-error"
import { RecordSectionErrorPanel } from "../../feedback"
import { joinRecordSectionClasses } from "./record-section-tokens"

type NoticeTone = "success" | "error" | "info"

const TONE_CLASS_NAME: Record<NoticeTone, string> = {
  success: "border-emerald-500/35 bg-emerald-500/12 text-emerald-700",
  error: "border-rose-500/35 bg-rose-500/12 text-rose-800",
  info: "border-blue-500/35 bg-blue-500/12 text-blue-800",
}

const TONE_ICON: Record<NoticeTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

function NoticeRow({ tone, children }: { tone: NoticeTone; children: ReactNode }) {
  const Icon = TONE_ICON[tone]
  return (
    <div
      className={joinRecordSectionClasses(
        "flex items-center gap-2 border-t px-5 py-2 text-sm font-medium",
        TONE_CLASS_NAME[tone],
      )}
    >
      <Icon size={15} aria-hidden="true" className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </div>
  )
}

function isStructuredError(error: unknown): error is RecordSectionError {
  return typeof error === "object" && error !== null && "kind" in error
}

/**
 * Slim, tone-tinted notice band for a record section. Rendered at the TOP of a
 * section — as the header band's second sub-row when the section has a header,
 * or standalone above the body when it's headerless — never mid-body. Replaces
 * the notices that used to crowd the section toolbar. Renders nothing when there
 * is no notice.
 */
export function RecordSectionNoticeStrip({
  message,
  error,
  noticeError,
  info,
}: {
  message?: string
  error?: ReactNode | RecordSectionError | null
  noticeError?: string
  info?: string
}) {
  const hasStructuredError = isStructuredError(error)
  const plainError = !hasStructuredError && error ? error : null

  if (!message && !error && !noticeError && !info) {
    return null
  }

  return (
    <>
      {hasStructuredError ? (
        <div className="border-t border-rose-500/35 px-5 py-2">
          <RecordSectionErrorPanel error={error as RecordSectionError} />
        </div>
      ) : null}
      {plainError ? <NoticeRow tone="error">{plainError}</NoticeRow> : null}
      {noticeError ? <NoticeRow tone="error">{noticeError}</NoticeRow> : null}
      {message ? <NoticeRow tone="success">{message}</NoticeRow> : null}
      {info ? <NoticeRow tone="info">{info}</NoticeRow> : null}
    </>
  )
}
