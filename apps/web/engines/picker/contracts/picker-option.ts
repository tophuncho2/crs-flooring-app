import type { ReactNode } from "react"

/**
 * The canonical option shape for every picker control in this engine — the
 * single contract the `SelectDropdown` (static), `AsyncRichDropdown` (async
 * search), and `PickerList` (async, in-panel) controls all consume. Consumers
 * map their own row type onto this shape via a small `toOption` mapper.
 *
 * Rendering is owned by the control by default (title + optional meta + stacked
 * subtitles); a consumer that needs a richer row passes a `renderOption` seam
 * to the control instead of overloading these fields.
 *
 * The legacy `DropdownOption` / `AsyncRichDropdownOption` / `PickerListOption`
 * names are retained as aliases of this type so existing call sites keep
 * compiling; new code should import `PickerOption` directly.
 */
export type PickerOption = {
  /** Stable id; also the selected value. */
  id: string
  /** Primary line. */
  title: string
  /** Single secondary line. `subtitles` takes precedence when non-empty. */
  subtitle?: string | null
  /**
   * Multiple stacked sub-lines, one per row. Takes precedence over `subtitle`.
   * Use for richer option cards (e.g. a template's job type + description).
   */
  subtitles?: string[]
  /** Small trailing detail rendered by the title (e.g. an item count). */
  meta?: ReactNode
  /** Blocks selection. */
  disabled?: boolean
}
