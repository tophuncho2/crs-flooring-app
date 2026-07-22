/**
 * Length limit for the free-text `itemName` column on TemplateServiceItem.
 * Mirrors the `@db.VarChar(N)` constraint in `schema.prisma`. Imported by the API
 * validators and UI cells so the cap lives in one TS source. (itemType is now a
 * required enum, not free text — no length cap.)
 */

export const TEMPLATE_SERVICE_ITEM_ITEM_NAME_MAX = 80
