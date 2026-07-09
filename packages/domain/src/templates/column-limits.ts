/**
 * Length limits for short free-text columns on Template.
 * Mirrors the `@db.VarChar(N)` constraints in `schema.prisma`. Imported
 * by the API validators and UI cells so the cap lives in one TS source.
 */

export const TEMPLATE_UNIT_TYPE_MAX = 40
export const TEMPLATE_CUSTOMER_NAME_MAX = 100
export const TEMPLATE_ACCOUNT_MANAGER_MAX = 100
export const TEMPLATE_DESCRIPTION_MAX = 120
export const TEMPLATE_INTERNAL_NOTES_MAX = 250
export const TEMPLATE_INSTALLER_INSTRUCTIONS_MAX = 500
