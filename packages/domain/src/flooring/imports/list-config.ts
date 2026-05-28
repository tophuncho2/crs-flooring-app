export const LIST_IMPORTS_PAGE_SIZE = 50
export const LIST_IMPORTS_MAX_PAGE_SIZE = 200

export const IMPORT_OPTIONS_DEFAULT_TAKE = 20
export const IMPORT_OPTIONS_MAX_TAKE = 50

export const LIST_IMPORTS_ALLOWED_GROUP_FIELDS = ["warehouse", "manufacturer"] as const

export type ListImportsAllowedGroupField = (typeof LIST_IMPORTS_ALLOWED_GROUP_FIELDS)[number]
