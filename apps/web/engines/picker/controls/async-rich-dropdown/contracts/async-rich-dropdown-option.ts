import type { PickerOption } from "../../../contracts/picker-option"

/**
 * Legacy name for the `AsyncRichDropdown` option shape, now an alias of the
 * canonical {@link PickerOption}. AsyncRichDropdown does no local filtering:
 * search runs server-side and `options` is whatever the controller most
 * recently fetched. Prefer importing `PickerOption` directly in new code.
 */
export type AsyncRichDropdownOption = PickerOption
