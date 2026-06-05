"use client"

import type { CellProps } from "./contracts/cell-base"
import { SelectDropdown, type DropdownOption } from "@/engines/dropdowns"
export type DropdownCellProps = CellProps<string | null> & {
  options: ReadonlyArray<DropdownOption>
  placeholder?: string
  allowClear?: boolean
}

/**
 * Cell wrapper around `SelectDropdown`. Use for grid cells that need richer
 * styling than a native `<select>` — e.g. category-coloured product picker,
 * options with hint subtext.
 *
 * Static mode renders the matched option's label as plain text.
 */
export function DropdownCell(props: DropdownCellProps) {
  if (props.editable) {
    return (
      <SelectDropdown
        value={props.value}
        onChange={(next) => props.onChange?.(next)}
        options={props.options}
        placeholder={props.placeholder}
        allowClear={props.allowClear}
        invalid={props.invalid}
        ariaLabel={props.ariaLabel}
        className={props.className}
      />
    )
  }

  const matched = props.options.find((option) => option.id === props.value)
  return (
    <span
      aria-label={props.ariaLabel}
      className={["block truncate text-sm", props.className].filter(Boolean).join(" ")}
    >
      {matched?.label || "-"}
    </span>
  )
}
