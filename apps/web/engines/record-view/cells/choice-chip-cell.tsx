"use client"

import { CellChip } from "@/engines/common"
import type { CellProps, CellTone } from "./contracts/cell-base"

const ALIGN_CLASS_NAME = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
} as const

// Cell-height parity: the input cells (NumberCell/DateCell/SelectCell) render at
// ~34px (text-sm + py-1.5 + border). CellChip's own box is shorter (py-0.5), so
// we floor the trigger to the input height to keep the editable row's vertical
// rhythm consistent — a chip that didn't match would float in a taller cell.
const CHIP_TRIGGER_CLASS_NAME = "w-full min-h-[34px] gap-1"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type ChoiceChipOption = {
  value: string
  label: string
  /** Drives the chip tone (e.g. success = green, error = red). */
  tone?: CellTone
  disabled?: boolean
}

export type ChoiceChipCellProps = CellProps<string> & {
  options: ReadonlyArray<ChoiceChipOption>
  placeholder?: string
}

/**
 * A choice rendered as a tone chip, editable via a dropdown. The dropdown sibling
 * of {@link SegmentedChoiceCell}: same `{ value, label, tone }` option contract,
 * but the selected value shows as a `CellChip` (Airtable coloured-cell feel)
 * instead of a segmented control, and picking is a compact dropdown rather than N
 * inline buttons. Use when the choice set reads better as a single coloured badge
 * (e.g. a payment direction: Revenue = green, Expense = red).
 *
 * Editable mode overlays a transparent native `<select>` on the chip so the cell
 * keeps native keyboard / picker semantics while presenting the chip. Read-only
 * mode renders just the chip (or "-" when the value matches no option).
 */
export function ChoiceChipCell(props: ChoiceChipCellProps) {
  const align = props.align ?? "start"
  const matched = props.options.find((option) => option.value === props.value)

  if (!props.editable) {
    if (!matched) {
      return (
        <span
          aria-label={props.ariaLabel}
          className={joinClassNames("block text-sm text-[var(--foreground)]/70", props.className)}
        >
          -
        </span>
      )
    }
    return (
      <span className={joinClassNames("flex", ALIGN_CLASS_NAME[align], props.className)}>
        <CellChip tone={matched.tone} className={joinClassNames(CHIP_TRIGGER_CLASS_NAME, "justify-center")}>
          {matched.label}
        </CellChip>
      </span>
    )
  }

  return (
    <span className={joinClassNames("relative inline-flex w-full", props.className)}>
      <CellChip
        tone={matched?.tone}
        className={joinClassNames(
          CHIP_TRIGGER_CLASS_NAME,
          "justify-between",
          matched ? undefined : "text-[var(--foreground)]/60",
        )}
      >
        {matched ? matched.label : props.placeholder ?? "Select"}
        <span aria-hidden className="opacity-60">
          ▾
        </span>
      </CellChip>
      <select
        aria-label={props.ariaLabel}
        aria-invalid={props.invalid || undefined}
        value={props.value}
        onChange={(event) => props.onChange?.(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {props.placeholder ? <option value="">{props.placeholder}</option> : null}
        {props.options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  )
}
