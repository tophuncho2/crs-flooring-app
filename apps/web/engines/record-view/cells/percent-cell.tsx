"use client"

import type { CellProps } from "./contracts/cell-base"
import { formatPercent } from "./contracts/cell-format"
import { NumberCell } from "./number-cell"

export type PercentCellProps = CellProps<string> & {
  placeholder?: string
  /** Fractional digits shown in read-only mode (default 2). */
  decimals?: number
}

/**
 * Percent composite — the sibling of `MoneyCell` for a percentage value. Editable
 * mode is a number input with a static `%` suffix (mirrors `PerUnitCell`); static
 * mode renders the formatted `"N%"` string. Values are plain percent numbers
 * ("30" = 30%), never fractions.
 */
export function PercentCell(props: PercentCellProps) {
  const align = props.align ?? "end"

  if (props.editable) {
    return (
      <div className="flex items-center justify-end gap-2">
        <NumberCell
          editable={true}
          value={props.value}
          onChange={props.onChange}
          align={align}
          tone={props.tone}
          invalid={props.invalid}
          ariaLabel={props.ariaLabel}
          className={props.className}
          placeholder={props.placeholder ?? "0.00"}
          maxDecimals={props.decimals ?? 2}
        />
        <span className="text-xs text-[var(--foreground)]/60">%</span>
      </div>
    )
  }

  const formatted = formatPercent(props.value, { decimals: props.decimals ?? 2 })

  return (
    <NumberCell
      editable={false}
      value={formatted || "-"}
      align={align}
      tone={props.tone}
      ariaLabel={props.ariaLabel}
      className={props.className}
    />
  )
}
