import type { SortMenuOption } from "@/engines/list-view"

/**
 * Shared product-attribute Sort options (category / style / color). Every list
 * whose rows link to a product spreads this fragment into its own `*_SORT_OPTIONS`
 * so the labels and direction-type semantics stay identical across modules — the
 * keys ARE the backend sort fields (see `PRODUCT_SORT_FIELDS` in `@builders/domain`
 * and the shared `productAttributeOrderBy` in `@builders/db`).
 */
export const PRODUCT_SORT_OPTIONS_FRAGMENT = [
  { key: "category", label: "Category", type: "text" },
  { key: "style", label: "Style", type: "text" },
  { key: "color", label: "Color", type: "text" },
] as const satisfies ReadonlyArray<SortMenuOption>
