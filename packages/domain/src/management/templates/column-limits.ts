/**
 * Length limits for short free-text columns on FlooringTemplate.
 * Mirrors the `@db.VarChar(N)` constraints in `schema.prisma`. Imported
 * by the API validators and UI cells so the cap lives in one TS source.
 */

export const TEMPLATE_UNIT_TYPE_MAX = 30
export const TEMPLATE_DESCRIPTION_MAX = 60
export const TEMPLATE_INTERNAL_NOTES_MAX = 250
export const TEMPLATE_INSTALLER_INSTRUCTIONS_MAX = 250
