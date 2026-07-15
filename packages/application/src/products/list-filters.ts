import type { ProductSearchInput } from "@builders/domain"

/**
 * Normalize the four shared product-search values (trim, drop empties) into a
 * repo-facing object — `undefined` when nothing survives. Shared by every list
 * whose rows link to a product (products, inventory, adjustments,
 * inventory-indicators) so the trim rule lives in exactly one place. The data
 * layer re-trims defensively via `buildProductSearchClauses`; this owns the
 * application-level presence check that keeps a search-only query from resolving
 * its filters to `undefined`.
 */
export function resolveProductSearchFilters(
  filters: ProductSearchInput | undefined,
): ProductSearchInput | undefined {
  const prodNumber = filters?.prodNumber?.trim() || undefined
  const color = filters?.color?.trim() || undefined
  const style = filters?.style?.trim() || undefined
  const namingAddon = filters?.namingAddon?.trim() || undefined

  if (!prodNumber && !color && !style && !namingAddon) return undefined

  return {
    ...(prodNumber ? { prodNumber } : {}),
    ...(color ? { color } : {}),
    ...(style ? { style } : {}),
    ...(namingAddon ? { namingAddon } : {}),
  }
}
