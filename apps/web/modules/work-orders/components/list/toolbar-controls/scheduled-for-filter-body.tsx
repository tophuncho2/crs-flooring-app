"use client"

import {
  thisMonthEastern,
  thisWeekEastern,
  todayEastern,
  type ScheduledForRange,
} from "./scheduled-for-presets"

export type ScheduledForFilterBodyProps = {
  start: string | null
  end: string | null
  onChange: (start: string | null, end: string | null) => void
}

const DATE_INPUT_CLASS_NAME =
  "rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] outline-none transition focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"

const PRESET_CLASS_NAME =
  "rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1 text-xs text-[var(--foreground)] transition hover:border-[var(--panel-border-strong)]"

/**
 * The work-order `scheduledFor` filter body — From / To date inputs plus quick
 * presets (Today / This week / This month). From-only ⇒ on/after; To-only ⇒
 * on/before; same date in both ⇒ that single day. Bounds are emitted as
 * `YYYY-MM-DD`, compared UTC-pinned to match the date-only column.
 *
 * Pure body — no trigger/popover chrome of its own. Hosted in the toolbar's
 * Filter menu as the `Date` control (the popover chrome + anchoring come from
 * the engine's `AnchoredPanel`). `normal-case`/`tracking-normal` reset the
 * surrounding uppercase styling for the inputs.
 */
export function ScheduledForFilterBody({ start, end, onChange }: ScheduledForFilterBodyProps) {
  const isActive = Boolean(start || end)
  const applyPreset = (range: ScheduledForRange) => onChange(range.start, range.end)

  return (
    <div className="flex w-[15rem] flex-col gap-3 normal-case tracking-normal">
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

      <label className="flex items-center justify-between gap-2 text-sm font-normal text-[var(--foreground)]">
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
      <label className="flex items-center justify-between gap-2 text-sm font-normal text-[var(--foreground)]">
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

      <div className="flex justify-end">
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
  )
}
