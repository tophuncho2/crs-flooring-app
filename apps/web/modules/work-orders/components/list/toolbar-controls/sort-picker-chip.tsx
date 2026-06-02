"use client"

import { useEffect, useRef, useState } from "react"
import { SortToggle } from "@/components/features/sort"

export type SortPickerField =
  | "createdAt"
  | "scheduledFor"
  | "property"
  | "managementCompany"
  | "workOrderNumber"

export type SortPickerChipProps = {
  field: SortPickerField
  direction: "asc" | "desc"
  onChange: (next: { field: SortPickerField; direction: "asc" | "desc" }) => void
}

const FIELD_LABEL: Record<SortPickerField, string> = {
  createdAt: "Created date",
  scheduledFor: "Scheduled date",
  property: "Property",
  managementCompany: "Management company",
  workOrderNumber: "WO #",
}

const FIELD_SHORT: Record<SortPickerField, string> = {
  createdAt: "Created",
  scheduledFor: "Scheduled",
  property: "Property",
  managementCompany: "Mgmt co",
  workOrderNumber: "WO #",
}

// Direction labels read naturally per field (desc = ascendingLabel's opposite).
const DIRECTION_LABELS: Record<SortPickerField, { asc: string; desc: string }> = {
  createdAt: { asc: "Oldest", desc: "Newest" },
  scheduledFor: { asc: "Earliest", desc: "Latest" },
  property: { asc: "A–Z", desc: "Z–A" },
  managementCompany: { asc: "A–Z", desc: "Z–A" },
  workOrderNumber: { asc: "Asc", desc: "Desc" },
}

const FIELDS: SortPickerField[] = [
  "createdAt",
  "scheduledFor",
  "property",
  "managementCompany",
  "workOrderNumber",
]

// Matches the picker dropdown triggers (rich-dropdown) so toolbar chips align.
const TRIGGER_CLASS_NAME =
  "flex w-full items-center justify-between gap-2 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 text-left text-sm text-[var(--foreground)] outline-none transition focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"

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
        className={TRIGGER_CLASS_NAME}
      >
        <span className="min-w-0 flex-1 truncate">Sort: {summary}</span>
        <span aria-hidden="true" className="shrink-0 text-[var(--foreground)]/60">
          ▾
        </span>
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
