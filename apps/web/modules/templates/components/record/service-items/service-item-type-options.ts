import { SERVICE_ITEM_TYPE_VALUES, type ServiceItemType } from "@builders/domain"
import type { DropdownOption } from "@/engines/picker"

// UI label map + dropdown options for the required service-item type enum. The
// values + type are the domain source of truth (@builders/domain); only the
// human-facing labels live here. Module-local for now — promote to a shared
// presentation contract when work-orders adopt the enum. DropdownOption is keyed
// `{ id, title }` (NOT value/label), so `id` carries the enum member.
export const SERVICE_ITEM_TYPE_LABELS: Record<ServiceItemType, string> = {
  LABOR: "Labor",
  MISCELLANEOUS: "Miscellaneous",
}

export const SERVICE_ITEM_TYPE_OPTIONS: DropdownOption[] = SERVICE_ITEM_TYPE_VALUES.map((value) => ({
  id: value,
  title: SERVICE_ITEM_TYPE_LABELS[value],
}))
