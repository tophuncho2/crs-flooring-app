"use client"

import { StatusBadge } from "@/components/badges"
import type { CutLogRow, FlooringCutLogStatus } from "@builders/domain"

function statusTone(status: FlooringCutLogStatus) {
  switch (status) {
    case "FINAL":
      return "success" as const
    case "QUEUED":
      return "processing" as const
    case "PENDING":
      return "warning" as const
    case "VOID":
      return "muted" as const
    default:
      return "muted" as const
  }
}

function formatStatValue(value: string | null, unitAbbrev: string | null) {
  if (value === null) return "—"
  return unitAbbrev ? `${value} ${unitAbbrev}` : value
}

/**
 * One row in the cuts-only-preview side panel. Lays out the six visible
 * surfaces (status, product, inventory item, cut, coverage, notes) so
 * the whole row reads as a hierarchy inside a narrow `w-[34rem]` panel.
 * No click handler — preview only.
 */
export function CutsOnlyPreviewRow({ row }: { row: CutLogRow }) {
  return (
    <div className="flex flex-col gap-2 border-b border-[var(--panel-border)]/60 px-3 py-3 last:border-b-0 hover:bg-[var(--panel-border)]/10">
      <div>
        <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
      </div>

      <div className="truncate text-sm font-medium text-[var(--foreground)]">
        {row.productName || "—"}
      </div>

      <div className="truncate text-xs text-[var(--foreground)]/65">
        {row.inventoryItem || "—"}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 pt-1">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wide text-[var(--foreground)]/55">
            Cut
          </span>
          <span className="text-sm tabular-nums text-[var(--foreground)]">
            {formatStatValue(row.cut, row.stockUnitAbbrev)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wide text-[var(--foreground)]/55">
            Coverage
          </span>
          <span className="text-sm tabular-nums text-[var(--foreground)]">
            {formatStatValue(row.coverageCut, row.itemCoverageUnitAbbrev)}
          </span>
        </div>
      </div>

      {row.notes ? (
        <p className="whitespace-pre-line text-xs text-[var(--foreground)]/65">
          {row.notes}
        </p>
      ) : null}
    </div>
  )
}
