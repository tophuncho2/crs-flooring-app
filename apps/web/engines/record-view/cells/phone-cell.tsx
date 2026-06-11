"use client"

import { formatPhoneNumber, normalizePhoneNumber } from "@builders/domain"
import type { CellProps } from "./contracts/cell-base"
import { NumberCell } from "./number-cell"

export type PhoneCellProps = CellProps<string> & {
  placeholder?: string
}

/**
 * Phone cell — the canonical editor/display for phone-of-record values.
 * Wraps `NumberCell` in integer mode (`maxDecimals={0}`) so free-form input is
 * stripped to bare digits as you type, normalizing on blur through the
 * **shared domain** `normalizePhoneNumber` (drops a leading country `1`), so the
 * field can never hold a value the backend would reshape. Read-only mode renders
 * the canonical `"(555) 123-4567"` via `formatPhoneNumber`, falling back to raw
 * digits for non-conforming values. The standard lives in `@builders/domain`;
 * this cell only consumes it.
 */
export function PhoneCell(props: PhoneCellProps) {
  if (props.editable) {
    return (
      <NumberCell
        editable
        value={props.value}
        onChange={props.onChange}
        align={props.align ?? "start"}
        tone={props.tone}
        invalid={props.invalid}
        ariaLabel={props.ariaLabel}
        className={props.className}
        placeholder={props.placeholder ?? "(555) 123-4567"}
        inputMode="numeric"
        maxDecimals={0}
        formatOnBlur={normalizePhoneNumber}
      />
    )
  }

  return (
    <NumberCell
      editable={false}
      reason={props.reason}
      value={formatPhoneNumber(props.value)}
      align={props.align ?? "start"}
      tone={props.tone}
      ariaLabel={props.ariaLabel}
      className={props.className}
    />
  )
}
