"use client"

import type { TemplateListRow } from "@builders/domain"

const EMPTY_CELL = "—"

export function PropertyHubViewTemplateRow({
  row,
  onClick,
}: {
  row: TemplateListRow
  onClick: (row: TemplateListRow) => void
}) {
  const unitType = row.unitType.trim().length > 0 ? row.unitType : EMPTY_CELL
  const propertyName = row.propertyName.trim()
  const jobType = (row.jobTypeName ?? "").trim()
  const description = row.description.trim()
  const secondary = [propertyName, jobType].filter((value) => value.length > 0).join(" · ")
  const itemsLabel = `${row.itemsCount} ${row.itemsCount === 1 ? "item" : "items"}`

  return (
    <button
      type="button"
      onClick={() => onClick(row)}
      className="grid w-full grid-cols-[1fr_auto] items-start gap-3 border-t border-blue-500/40 px-3 py-2 text-left transition first:border-t-0 hover:bg-[var(--panel-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm text-[var(--foreground)]/85">{unitType}</span>
        {secondary.length > 0 ? (
          <span className="truncate text-xs text-[var(--foreground)]/55">{secondary}</span>
        ) : null}
        {description.length > 0 ? (
          <span className="truncate text-xs text-[var(--foreground)]/55">{description}</span>
        ) : null}
      </div>
      <span className="shrink-0 border-l border-blue-500/40 pl-3 text-xs tabular-nums text-[var(--foreground)]/70">
        {itemsLabel}
      </span>
    </button>
  )
}
