"use client"

import { useMemo, useState } from "react"

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

function parseDateValue(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  return { year, month, day }
}

function formatDateValue(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0")
  const dd = String(day).padStart(2, "0")
  return `${year}-${mm}-${dd}`
}

function startOfMonthOffset(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

type ViewMonth = { year: number; month: number }

function todayViewMonth(): ViewMonth {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}

/**
 * Always-visible inline mini calendar. Value is the same `YYYY-MM-DD`
 * string the existing `DateCell` produces. No popover; no dependencies.
 * Clicking a day calls `onChange` with the picked date. Prev / next
 * navigate the month view without changing the selected value.
 */
export function WorkOrderScheduleCalendar({
  value,
  onChange,
  editable,
}: {
  value: string
  onChange: (next: string) => void
  editable: boolean
}) {
  const parsed = useMemo(() => parseDateValue(value), [value])
  const [viewMonth, setViewMonth] = useState<ViewMonth>(() =>
    parsed ? { year: parsed.year, month: parsed.month } : todayViewMonth(),
  )

  const days = useMemo(() => buildDayGrid(viewMonth), [viewMonth])

  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth()
  const todayDay = today.getDate()

  function gotoPrevMonth() {
    setViewMonth((prev) => {
      const next = new Date(prev.year, prev.month - 1, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  function gotoNextMonth() {
    setViewMonth((prev) => {
      const next = new Date(prev.year, prev.month + 1, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] p-2 text-sm">
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          aria-label="Previous month"
          onClick={gotoPrevMonth}
          className="rounded-md px-2 py-0.5 text-[var(--foreground)]/70 hover:bg-[var(--panel-border)]/30 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
        >
          &lt;
        </button>
        <span className="text-xs font-semibold text-[var(--foreground)]/85">
          {MONTH_LABELS[viewMonth.month]} {viewMonth.year}
        </span>
        <button
          type="button"
          aria-label="Next month"
          onClick={gotoNextMonth}
          className="rounded-md px-2 py-0.5 text-[var(--foreground)]/70 hover:bg-[var(--panel-border)]/30 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
        >
          &gt;
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] uppercase tracking-wide text-[var(--foreground)]/50">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((cell, index) => {
          const isSelected =
            parsed !== null &&
            cell.year === parsed.year &&
            cell.month === parsed.month &&
            cell.day === parsed.day
          const isToday =
            cell.year === todayYear && cell.month === todayMonth && cell.day === todayDay

          const baseClasses =
            "flex h-7 w-full items-center justify-center rounded-md text-xs transition focus:outline-none focus:ring-1 focus:ring-sky-500/40"
          const toneClasses = cell.inCurrentMonth
            ? "text-[var(--foreground)]"
            : "text-[var(--foreground)]/35"
          const selectionClasses = isSelected
            ? "bg-sky-500/25 text-sky-900 ring-1 ring-sky-500/50"
            : isToday
            ? "ring-1 ring-[var(--panel-border)]"
            : ""
          const interactiveClasses = editable
            ? "cursor-pointer hover:bg-[var(--panel-border)]/30"
            : "cursor-default"

          return (
            <button
              key={index}
              type="button"
              disabled={!editable}
              aria-label={`${MONTH_LABELS[cell.month]} ${cell.day}, ${cell.year}`}
              aria-pressed={isSelected}
              onClick={() => {
                if (!editable) return
                onChange(formatDateValue(cell.year, cell.month, cell.day))
                setViewMonth({ year: cell.year, month: cell.month })
              }}
              className={[baseClasses, toneClasses, selectionClasses, interactiveClasses].join(" ")}
            >
              {cell.day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

type DayCell = {
  year: number
  month: number
  day: number
  inCurrentMonth: boolean
}

function buildDayGrid(view: ViewMonth): DayCell[] {
  const cells: DayCell[] = []
  const offset = startOfMonthOffset(view.year, view.month)
  const totalDays = daysInMonth(view.year, view.month)
  const prevMonthDate = new Date(view.year, view.month - 1, 1)
  const prevYear = prevMonthDate.getFullYear()
  const prevMonth = prevMonthDate.getMonth()
  const prevTotal = daysInMonth(prevYear, prevMonth)

  for (let i = 0; i < offset; i++) {
    cells.push({
      year: prevYear,
      month: prevMonth,
      day: prevTotal - offset + 1 + i,
      inCurrentMonth: false,
    })
  }
  for (let day = 1; day <= totalDays; day++) {
    cells.push({ year: view.year, month: view.month, day, inCurrentMonth: true })
  }
  let trailingDay = 1
  const nextMonthDate = new Date(view.year, view.month + 1, 1)
  const nextYear = nextMonthDate.getFullYear()
  const nextMonth = nextMonthDate.getMonth()
  while (cells.length < 42) {
    cells.push({ year: nextYear, month: nextMonth, day: trailingDay, inCurrentMonth: false })
    trailingDay += 1
  }
  return cells
}
