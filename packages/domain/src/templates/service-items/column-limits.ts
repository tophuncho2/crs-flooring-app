/**
 * Length limits for the free-text columns on TemplateServiceItem. Mirrors the
 * `@db.VarChar(N)` constraints in `schema.prisma`. Imported by the API validators
 * and UI cells so the cap lives in one TS source.
 */

export const TEMPLATE_SERVICE_ITEM_ITEM_TYPE_MAX = 40
export const TEMPLATE_SERVICE_ITEM_ITEM_NAME_MAX = 80
