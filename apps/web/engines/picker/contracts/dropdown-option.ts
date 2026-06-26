import type { PickerOption } from "./picker-option"

/**
 * Legacy name for the static `SelectDropdown` option shape, now an alias of the
 * canonical {@link PickerOption}. `title` is the rendered text; `subtitle` is the
 * optional secondary line; `disabled` blocks selection. Prefer importing
 * `PickerOption` directly in new code.
 */
export type DropdownOption = PickerOption
