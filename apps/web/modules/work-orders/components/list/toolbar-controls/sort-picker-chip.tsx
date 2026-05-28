"use client"

import { useEffect, useRef, useState } from "react"
import { SortToggle } from "@/components/features/sort"

export type SortPickerField = "createdAt" | "scheduledFor"

export type SortPickerChipProps = {
  field: SortPickerField
  direction: "asc" | "desc"
  onChange: (next: { field: SortPickerField; direction: "asc" | "desc" }) => void
}

const FIELD_LABEL: Record<SortPickerField, string> = {
  createdAt: "Created date",
  scheduledFor: "Scheduled date",
}

const FIELD_SHORT: Record<SortPickerField, string> = {
  createdAt: "Created",
  scheduledFor: "Scheduled",
}

// Direction labels read naturally per field (desc = ascendingLabel's opposite).
const DIRECTION_LABELS: Record<SortPickerField, { asc: string; desc: string }> = {
  createdAt: { asc: "Oldest", desc: "Newest" },
  scheduledFor: { asc: "Earliest", desc: "Latest" },
}

const FIELDS: SortPickerField[] = ["createdAt", "scheduledFor"]

/**
 * Work-order list-view chip — picks the sort column (Created date or Scheduled
 * date, one at a time) and direction. Composes the shared `SortToggle` for the
 * direction control. Sorting by `scheduledFor` orders unscheduled work orders
 * last in both directions (server-side).
 */
export function SortPickerChip({ field, direction, onChange }: SortPickerChipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  const labels = DIRECTION_LABELS[field]
  const summary = `${FIELD_SHORT[field]} ${direction === "asc" ? "↑" : "↓"}`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Sort work orders by ${FIELD_LABEL[field]}, ${
          direction === "asc" ? labels.asc : labels.desc
        }`}
        className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-1.5 text-sm text-[var(--foreground)] transition hover:border-[var(--panel-border-strong)]"
      >
        Sort: {summary}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Sort work orders"
          className="absolute z-20 mt-1 w-[15rem] rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] p-2 shadow-lg"
        >
          <div className="flex flex-col gap-1">
            {FIELDS.map((option) => {
              const selected = option === field
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange({ field: option, direction })}
                  className={[
                    "rounded px-2 py-1.5 text-left text-sm transition",
                    selected
                      ? "bg-blue-500/15 text-blue-700"
                      : "text-[var(--foreground)] hover:bg-[var(--panel-border)]/30",
                  ].join(" ")}
                >
                  {FIELD_LABEL[option]}
                </button>
              )
            })}
          </div>
          <div className="mt-2 border-t border-[var(--panel-border)] pt-2">
            <SortToggle
              sortKey={field}
              direction={direction}
              onChange={(next) => onChange({ field, direction: next.direction })}
              ascendingLabel={labels.asc}
              descendingLabel={labels.desc}
              className="w-full justify-center"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
