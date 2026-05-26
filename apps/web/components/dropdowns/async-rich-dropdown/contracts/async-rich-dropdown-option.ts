// Option shape for `AsyncRichDropdown`. Mirrors `RichDropdownOption` so the
// two dropdowns render identically — the only difference is that
// AsyncRichDropdown does no local filtering: search runs server-side and
// `options` is whatever the controller most recently fetched.

export type AsyncRichDropdownOption = {
  id: string
  title: string
  subtitles?: string[]
  /** Small trailing detail rendered by the title (e.g. an item count). */
  meta?: string
  disabled?: boolean
}
