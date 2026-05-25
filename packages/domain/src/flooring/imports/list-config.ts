// Cross-layer config for the imports list view. Declared in domain because
// these values are referenced by both server-side use cases / route validators
// (in @builders/application) and the client-side controller / data wrapper
// (in apps/web/modules/imports/). Domain is the only package safely importable
// from both sides — application's barrel re-exports admin, which transitively
// pulls bcrypt into the client bundle and breaks the browser build.

export const LIST_IMPORTS_PAGE_SIZE = 50
export const LIST_IMPORTS_MAX_PAGE_SIZE = 200

// Pagination bounds for the imports async picker (options query). Referenced by
// both the API options validator and the search-import-options use case so the
// cap lives in one place.
export const IMPORT_OPTIONS_DEFAULT_TAKE = 20
export const IMPORT_OPTIONS_MAX_TAKE = 50

export const LIST_IMPORTS_ALLOWED_GROUP_FIELDS = ["warehouse", "manufacturer"] as const

export type ListImportsAllowedGroupField = (typeof LIST_IMPORTS_ALLOWED_GROUP_FIELDS)[number]
