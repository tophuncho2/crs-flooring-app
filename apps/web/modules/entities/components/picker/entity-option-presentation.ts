import type { EntityOption } from "@builders/domain"
import type { PickerListOption } from "@/engines/picker"

/**
 * The single source of truth for how an entity renders inside the entity picker —
 * its option title, its subtitle lines, and what label sticks on the trigger after
 * select. Set once here so every deployment of the entity picker (payments,
 * properties, work-order/template/property list filters) shows the same thing.
 *
 * Canonical sort is **alphabetical by entity name**, enforced server-side in the
 * read repository (`listEntityOptions` / `searchEntityOptions` order by `entity asc`),
 * so it needs no client-side re-sort.
 */

/** The entity's display name — the option title line and the on-select trigger label. */
export function entityOptionLabel(option: EntityOption): string {
  return option.entity
}

/**
 * Build the picker option: entity name on the title line, then two stacked subtitle
 * lines — the linked type, then the address. Empty lines drop out, so a type-less
 * or address-less entity collapses to just the lines it has.
 */
export function toEntityOption(option: EntityOption): PickerListOption {
  const typeText = option.type?.type ?? ""
  const subtitles = [typeText, option.fullAddress].filter(Boolean)
  return {
    id: option.id,
    title: entityOptionLabel(option),
    subtitles,
  }
}
