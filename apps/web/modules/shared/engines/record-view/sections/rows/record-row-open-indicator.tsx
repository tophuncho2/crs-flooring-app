"use client"

import { TextCell } from "../cells/text-cell"

export function RecordRowOpenIndicator({
  loading = false,
  label = "Open",
  loadingLabel = "Loading...",
}: {
  loading?: boolean
  label?: string
  loadingLabel?: string
}) {
  return (
    <TextCell align="center" className="font-medium text-sky-400">
      {loading ? loadingLabel : label}
    </TextCell>
  )
}
