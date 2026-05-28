"use client"

import { useEffect, useRef, useState } from "react"
import { formatStableDate } from "@builders/domain"
import {
  thisMonthEastern,
  thisWeekEastern,
  todayEastern,
  type ScheduledForRange,
} from "./scheduled-for-presets"

export type ScheduledForFilterChipProps = {
  start: string | null
  end: string | null
  onChange: (start: string | null, end: string | null) => void
}

function summarize(start: string | null, end: string | null): string {
  if (start && end) {
    return start === end
      ? formatStableDate(start)
      : `${formatStableDate(start)} – ${formatStableDate(end)}`
  }
  if (start) return `≥ ${formatStableDate(start)}`
  if (end) return `≤ ${formatStableDate(end)}`
  return "Any date"
}

const DATE_INPUT_CLASS_NAME =
  "rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] outline-none transition focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"

const PRESET_CLASS_NAME =
  "rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1 text-xs text-[var(--foreground)] transition hover:border-[var(--panel-border-strong)]"

// Matches the picker dropdown triggers (rich-dropdown) so toolbar chips align.
const TRIGGER_CLASS_NAME =
  "flex w-full items-center justify-between gap-2 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 text-left text-sm text-[var(--foreground)] outline-none transition focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"

/**
 * Work-order list-view chip — narrows the table by `scheduledFor`. A popover
 * holds From / To date inputs plus quick presets (Today / This week / This
 * month). From-only ⇒ on/after; To-only ⇒ on/before; same date in both ⇒ that
 * single day. Bounds are emitted as `YYYY-MM-DD` and compared UTC-pinned to
 * match the date-only column.
 */
export function ScheduledForFilterChip({ start, end, onChange }: ScheduledForFilterChipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isActive = Boolean(start || end)

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

  const applyPreset = (range: ScheduledForRange) => onChange(range.start, range.end)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Filter work orders by scheduled date: ${summarize(start, end)}`}
        className={TRIGGER_CLASS_NAME}
      >
        <span className="min-w-0 flex-1 truncate">Scheduled: {summarize(start, end)}</span>
        <span aria-hidden="true" className="shrink-0 text-[var(--foreground)]/60">
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Scheduled date filter"
          className="absolute z-20 mt-1 w-[16rem] rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] p-3 shadow-lg"
        >
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={PRESET_CLASS_NAME} onClick={() => applyPreset(todayEastern())}>
              Today
            </button>
            <button type="button" className={PRESET_CLASS_NAME} onClick={() => applyPreset(thisWeekEastern())}>
              This week
            </button>
            <button type="button" className={PRESET_CLASS_NAME} onClick={() => applyPreset(thisMonthEastern())}>
              This month
            </button>
          </div>

          <label className="mt-3 flex items-center justify-between gap-2 text-sm text-[var(--foreground)]">
            <span className="w-10 shrink-0">From</span>
            <input
              type="date"
              value={start ?? ""}
              max={end ?? undefined}
              onChange={(event) => onChange(event.target.value || null, end)}
              aria-label="Scheduled on or after"
              className={`${DATE_INPUT_CLASS_NAME} flex-1`}
            />
          </label>
          <label className="mt-2 flex items-center justify-between gap-2 text-sm text-[var(--foreground)]">
            <span className="w-10 shrink-0">To</span>
            <input
              type="date"
              value={end ?? ""}
              min={start ?? undefined}
              onChange={(event) => onChange(start, event.target.value || null)}
              aria-label="Scheduled on or before"
              className={`${DATE_INPUT_CLASS_NAME} flex-1`}
            />
          </label>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => onChange(null, null)}
              disabled={!isActive}
              className="rounded-md px-2.5 py-1 text-xs text-[var(--foreground)]/70 transition hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
