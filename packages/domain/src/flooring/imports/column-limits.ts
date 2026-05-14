/**
 * Length limits for short free-text columns on FlooringImportEntry.
 * Mirrors the `@db.VarChar(N)` constraints in `schema.prisma`. Imported
 * by the API validators and UI cells so the cap lives in one TS source.
 */

export const IMPORT_PURCHASE_ORDER_NUMBER_MAX = 50
export const IMPORT_INTERNAL_NOTES_MAX = 250
