"use client"

import type { CellProps } from "./contracts/cell-base"
import { formatPerUnit } from "./contracts/cell-format"
import { NumberCell } from "./number-cell"

export type PerUnitCellProps = CellProps<string> & {
  placeholder?: string
  /** The "per <unit>" suffix unit (e.g. `"sqft"` for `"$0.85 / sqft"`). */
  unit: string
  currencyPrefix?: string
  decimals?: number
}

/**
 * Currency-per-unit composite. Editable mode is just a number input (the
 * "/ unit" suffix shows as a static label). Static mode renders the formatted
 * "$X.XX / unit" string.
 */
export function PerUnitCell(props: PerUnitCellProps) {
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
          prefix={props.currencyPrefix ?? "$"}
          maxDecimals={props.decimals ?? 2}
        />
        <span className="text-xs text-[var(--foreground)]/60">
          / {props.unit || "unit"}
        </span>
      </div>
    )
  }

  const formatted = formatPerUnit(props.value, props.unit, {
    currencyPrefix: props.currencyPrefix ?? "$",
    decimals: props.decimals ?? 2,
  })

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
