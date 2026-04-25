"use client"

import type { CellProps } from "./contracts/cell-base"
import { NumberCell } from "./number-cell"

export type UnitCellProps = CellProps<string> & {
  placeholder?: string
  /** Unit suffix rendered next to the value (e.g. `"sqft"`, `"pcs"`). */
  unit: string
}

/**
 * Quantity cell with a unit suffix. Editable mode renders a number input with
 * the unit shown as a static label to the right; static mode renders
 * "<value> <unit>".
 */
export function UnitCell(props: UnitCellProps) {
  const align = props.align ?? "center"

  if (props.editable) {
    return (
      <div className="flex items-center justify-center gap-2">
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
        />
        {props.unit ? (
          <span className="text-xs text-[var(--foreground)]/60">{props.unit}</span>
        ) : null}
      </div>
    )
  }

  const display = props.value
    ? props.unit
      ? `${props.value} ${props.unit}`
      : props.value
    : "-"

  return (
    <NumberCell
      editable={false}
      value={display}
      align={align}
      tone={props.tone}
      ariaLabel={props.ariaLabel}
      className={props.className}
    />
  )
}
