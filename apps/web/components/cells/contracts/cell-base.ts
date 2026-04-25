// Base props every cell receives. Extends EditabilityContract so cells get
// `editable: true` (with required `onChange`) or `editable: false` (with an
// optional `reason`). Concrete cells extend `CellProps<TValue>` with
// kind-specific knobs (e.g. `currencyPrefix?: string`).

import type { EditabilityContract } from "../../grid/contracts/grid-editability"
import type { CellAlign } from "../../grid/contracts/grid-cell-kind"
import type { CellTone } from "./cell-tone"

export type { CellAlign, CellTone }

export type CellProps<TValue> = EditabilityContract & {
  value: TValue
  onChange?: (next: TValue) => void
  align?: CellAlign
  tone?: CellTone
  invalid?: boolean
  ariaLabel?: string
  className?: string
}
