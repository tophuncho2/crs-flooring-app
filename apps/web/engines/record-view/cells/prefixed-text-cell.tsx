"use client"

import type { CellProps } from "./contracts/cell-base"
import { TextCell } from "./text-cell"

export type PrefixedTextCellProps = CellProps<string> & {
  placeholder?: string
  /** Static prefix rendered to the left of the value (e.g. `"ROLL#"`). */
  prefix: string
}

/**
 * Text cell with a static prefix label rendered to the left. Mirror of
 * `UnitCell` (which places its unit on the right). Editable mode renders
 * the prefix as a static `<span>` adjacent to a `TextCell` input; static
 * mode renders `"<prefix><value>"` when value is non-empty, else `"-"`.
 */
export function PrefixedTextCell(props: PrefixedTextCellProps) {
  if (props.editable) {
    return (
      <div className="flex items-center gap-2">
        {props.prefix ? (
          <span className="text-xs text-[var(--foreground)]/60">{props.prefix}</span>
        ) : null}
        <TextCell
          editable={true}
          value={props.value}
          onChange={props.onChange}
          align={props.align}
          tone={props.tone}
          invalid={props.invalid}
          ariaLabel={props.ariaLabel}
          className={props.className}
          placeholder={props.placeholder}
        />
      </div>
    )
  }

  const display = props.value ? `${props.prefix}${props.value}` : "-"
  return (
    <TextCell
      editable={false}
      value={display}
      align={props.align}
      tone={props.tone}
      ariaLabel={props.ariaLabel}
      className={props.className}
    />
  )
}
