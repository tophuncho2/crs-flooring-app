"use client"

import type { CellProps } from "./contracts/cell-base"
import { formatCurrency } from "./contracts/cell-format"
import { NumberCell } from "./number-cell"

export type CurrencyCellProps = CellProps<string> & {
  placeholder?: string
  /** Currency prefix shown in static mode. Default `"$"`. */
  currencyPrefix?: string
  decimals?: number
}

/**
 * Currency cell. In editable mode, delegates to NumberCell (raw decimal
 * input — no live formatting; preserves caret). In static mode, renders the
 * formatted currency string with the configured prefix + decimals.
 */
export function CurrencyCell(props: CurrencyCellProps) {
  const align = props.align ?? "end"

  if (props.editable) {
    return (
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
    )
  }

  const formatted = formatCurrency(props.value, {
    prefix: props.currencyPrefix ?? "$",
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
