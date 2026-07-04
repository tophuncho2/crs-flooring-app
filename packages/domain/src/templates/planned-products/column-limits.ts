/**
 * Length limits for short free-text columns on TemplatePlannedProduct.
 * Mirrors the `@db.VarChar(N)` constraints in `schema.prisma`. Imported
 * by the API validators and UI cells so the cap lives in one TS source.
 */

export const TEMPLATE_PLANNED_PRODUCT_NOTES_MAX = 30
