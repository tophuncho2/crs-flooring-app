"use client"

import { formatAdjustmentStatus, type FlooringInventoryAdjustmentStatus } from "@builders/domain"

export type AdjustmentStatusSegmentedControlProps = {
  /** A status selects that status only; `undefined` = All. */
  value: FlooringInventoryAdjustmentStatus | undefined
  onChange: (next: FlooringInventoryAdjustmentStatus | undefined) => void
}

const SEGMENTS: Array<{
  key: string
  label: string
  value: FlooringInventoryAdjustmentStatus | undefined
}> = [
  { key: "all", label: "All", value: undefined },
  { key: "pending", label: formatAdjustmentStatus("PENDING"), value: "PENDING" },
  { key: "queued", label: formatAdjustmentStatus("QUEUED"), value: "QUEUED" },
  { key: "final", label: formatAdjustmentStatus("FINAL"), value: "FINAL" },
]

/**
 * Adjustments list-view segmented control over the adjustment's own lifecycle
 * status. Four mutually-exclusive states (All / Pending / Queued / Final).
 * Designed to live inside a `ListToolbarTallCard` labelled "Status". Mirrors the
 * inventory `ArchiveSegmentedControl`.
 */
export function AdjustmentStatusSegmentedControl({
  value,
  onChange,
}: AdjustmentStatusSegmentedControlProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Adjustment status"
      className="inline-flex w-full items-stretch rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] p-0.5"
    >
      {SEGMENTS.map((segment) => {
        const isActive = value === segment.value
        return (
          <button
            key={segment.key}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(segment.value)}
            className={[
              "flex-1 rounded px-2 py-1 text-xs font-medium transition",
              isActive
                ? "bg-blue-500/15 text-blue-700"
                : "text-[var(--foreground)]/70 hover:text-[var(--foreground)]",
            ].join(" ")}
          >
            {segment.label}
          </button>
        )
      })}
    </div>
  )
}
