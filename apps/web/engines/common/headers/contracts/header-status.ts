// Status surface a header can render. `tone` keys into the shared tone
// vocabulary; `label` is the visible text; `detail` is an optional secondary
// line for more context.

import type { CellTone } from "../../contracts/cell-tone"

export type HeaderStatus = {
  tone: CellTone
  label: string
  detail?: string
}
