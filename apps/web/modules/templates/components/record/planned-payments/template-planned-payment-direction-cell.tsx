"use client"

import { CellChip } from "@/engines/common"
import type { FlooringPaymentDirection } from "@builders/domain"

// Direction as a dropdown that reads as a tone badge: Revenue = green (success),
// Expense = red (error). A real native <select> is overlaid transparently on top
// of the CellChip so the cell keeps the exact chip vocabulary while staying a
// genuine dropdown. Module-local by design (one consumer).
const DIRECTION_OPTIONS: {
  value: FlooringPaymentDirection
  label: string
  tone: "success" | "error"
}[] = [
  { value: "REVENUE", label: "Revenue", tone: "success" },
  { value: "EXPENSE", label: "Expense", tone: "error" },
]

export function TemplatePlannedPaymentDirectionCell({
  value,
  editable,
  onChange,
  ariaLabel,
}: {
  value: FlooringPaymentDirection
  editable: boolean
  onChange: (next: FlooringPaymentDirection) => void
  ariaLabel?: string
}) {
  const active = DIRECTION_OPTIONS.find((option) => option.value === value) ?? DIRECTION_OPTIONS[0]

  const chip = (
    <CellChip tone={active.tone} className="w-full justify-between gap-1">
      {active.label}
      {editable ? (
        <span aria-hidden className="opacity-60">
          ▾
        </span>
      ) : null}
    </CellChip>
  )

  if (!editable) {
    return <span aria-label={ariaLabel}>{chip}</span>
  }

  return (
    <span className="relative inline-flex w-full">
      {chip}
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value as FlooringPaymentDirection)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {DIRECTION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  )
}
