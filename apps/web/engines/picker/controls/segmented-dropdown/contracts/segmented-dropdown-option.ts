// Option shape for `SegmentedDropdown`. `value` is the emitted string; `label`
// is the rendered button text. Consumers map their own enums onto this shape.

import type { CellTone } from "@/engines/common"

export type SegmentedDropdownOption = {
  value: string
  label: string
  /** Drives the selected-segment fill colour. Omit for the neutral fill. */
  tone?: CellTone
  disabled?: boolean
}
