// Cross-layer config for the products list view. Declared in domain because
// these values are referenced by both server-side use cases / route validators
// (in @builders/application) and the client-side controller / data wrapper
// (in apps/web/modules/products/).

import type { ProductRow } from "./types.js"

export const LIST_PRODUCTS_PAGE_SIZE = 50
export const LIST_PRODUCTS_MAX_PAGE_SIZE = 200

export type ProductListRow = ProductRow
