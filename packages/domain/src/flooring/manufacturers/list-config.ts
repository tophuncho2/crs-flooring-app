// Cross-layer config for the manufacturers list view. Declared in domain
// because these values are referenced by both server-side use cases / route
// validators (in @builders/application) and the client-side controller / data
// wrapper (in apps/web/modules/manufacturers/).

import type { ManufacturerRow } from "./types.js"

export const LIST_MANUFACTURERS_PAGE_SIZE = 50
export const LIST_MANUFACTURERS_MAX_PAGE_SIZE = 200

export type ManufacturerListRow = ManufacturerRow
