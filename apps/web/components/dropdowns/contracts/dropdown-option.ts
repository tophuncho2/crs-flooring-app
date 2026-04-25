// Standard option shape for dropdowns. `id` is the value; `label` is the
// rendered text; `hint` is an optional secondary line; `disabled` blocks
// selection. Consumers map their own option types onto this shape before
// passing in.

export type DropdownOption = {
  id: string
  label: string
  hint?: string
  disabled?: boolean
}
