// Option shape for `SegmentedDropdown`. `value` is the emitted string; `label`
// is the rendered button text. Consumers map their own enums onto this shape.

export type SegmentedDropdownOption = {
  value: string
  label: string
  disabled?: boolean
}
