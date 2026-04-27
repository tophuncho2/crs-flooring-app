// Option shape for `RichDropdown`. Each option has a primary `title` line and
// an optional `subtitles` array rendered below in a smaller, muted font. The
// dropdown searches against the title and every subtitle.
//
// Example for a property picker:
//   { id: "prop-1", title: "Mercer Apartments", subtitles: ["1240 Mercer Ave · Springfield, IL"] }

export type RichDropdownOption = {
  id: string
  title: string
  subtitles?: string[]
  disabled?: boolean
}
