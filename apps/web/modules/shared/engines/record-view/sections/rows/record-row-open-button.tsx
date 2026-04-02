"use client"

import { ExternalLink } from "lucide-react"
import { joinRecordSectionClasses } from "./record-section-tokens"

export function RecordRowOpenButton({
  onOpen,
  label = "Open",
  loadingLabel = "Loading...",
  loading = false,
  className,
}: {
  onOpen: () => void
  label?: string
  loadingLabel?: string
  loading?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onOpen()
      }}
      onKeyDown={(event) => {
        event.stopPropagation()
      }}
      disabled={loading}
      className={joinRecordSectionClasses(
        "inline-flex min-h-[2.5rem] items-center justify-center gap-2 whitespace-nowrap rounded-md border border-sky-500/30 px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <ExternalLink size={16} />
      <span>{loading ? loadingLabel : label}</span>
    </button>
  )
}
