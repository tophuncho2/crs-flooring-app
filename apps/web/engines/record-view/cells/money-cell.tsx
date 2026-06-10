"use client"

import { formatMoney, normalizeMoneyAmount } from "@builders/domain"
import type { CellProps } from "./contracts/cell-base"
import { NumberCell } from "./number-cell"

export type MoneyCellProps = CellProps<string> & {
  placeholder?: string
  /** Currency symbol shown before the amount. Default `"$"`. */
  prefix?: string
}

/**
 * Currency cell — the canonical editor/display for money-of-record values.
 * Wraps `NumberCell`, pinning scale to the money standard (exactly 2 decimals)
 * and normalizing on blur through the **shared domain** `normalizeMoneyAmount`,
 * so the field can never hold a value the backend would reshape. Read-only mode
 * renders the canonical `"$X.XX"` via `formatMoney`. The standard lives in
 * `@builders/domain`; this cell only consumes it.
 */
export function MoneyCell(props: MoneyCellProps) {
  const prefix = props.prefix ?? "$"

  if (props.editable) {
    return (
      <NumberCell
        editable
        value={props.value}
        onChange={props.onChange}
        align={props.align ?? "end"}
        tone={props.tone}
        invalid={props.invalid}
        ariaLabel={props.ariaLabel}
        className={props.className}
        placeholder={props.placeholder ?? "0.00"}
        inputMode="decimal"
        maxDecimals={2}
        prefix={prefix}
        formatOnBlur={normalizeMoneyAmount}
      />
    )
  }

  return (
    <NumberCell
      editable={false}
      reason={props.reason}
      value={formatMoney(props.value, { prefix })}
      align={props.align ?? "end"}
      tone={props.tone}
      ariaLabel={props.ariaLabel}
      className={props.className}
    />
  )
}
