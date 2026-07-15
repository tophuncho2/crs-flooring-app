// Cross-layer allowlists for the product-based Search and Sort tools. Declared in
// domain because every layer references them: the data where/order-by builders
// (@builders/db), the use cases + route validators (@builders/application), and
// the client controllers / search-control UI (apps/web). They apply on the
// Products list itself AND on every list whose rows link to a product (inventory,
// adjustments, inventory-indicators), so keeping the keys in one place stops the
// per-module allowlists from drifting.

/**
 * Free-text product-search keys shared across every consumer's toolbar. Excludes
 * product name on purpose — the linked tables already carry a product picker
 * filter, so a redundant name bar is omitted there; Products keeps its own
 * `q`→name search module-local.
 */
export const PRODUCT_SEARCH_KEYS = ["prodNumber", "color", "style", "namingAddon"] as const
export type ProductSearchKey = (typeof PRODUCT_SEARCH_KEYS)[number]

/** Product-attribute Sort fields shared across every consumer's Sort menu. */
export const PRODUCT_SORT_FIELDS = ["category", "style", "color"] as const
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number]

/** Raw (untrimmed) product-search values, keyed by {@link PRODUCT_SEARCH_KEYS}. */
export type ProductSearchInput = Partial<Record<ProductSearchKey, string>>
