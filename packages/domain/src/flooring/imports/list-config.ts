// Cross-layer config for the imports list view. Declared in domain because
// these values are referenced by both server-side use cases / route validators
// (in @builders/application) and the client-side controller / data wrapper
// (in apps/web/modules/imports/). Domain is the only package safely importable
// from both sides — application's barrel re-exports admin, which transitively
// pulls bcrypt into the client bundle and breaks the browser build.

export const LIST_IMPORTS_PAGE_SIZE = 50
export const LIST_IMPORTS_MAX_PAGE_SIZE = 200

export const LIST_IMPORTS_ALLOWED_SORT_FIELDS = ["importNumber"] as const
export const LIST_IMPORTS_ALLOWED_GROUP_FIELDS = ["warehouse", "manufacturer"] as const

export type ListImportsAllowedSortField = (typeof LIST_IMPORTS_ALLOWED_SORT_FIELDS)[number]
export type ListImportsAllowedGroupField = (typeof LIST_IMPORTS_ALLOWED_GROUP_FIELDS)[number]
