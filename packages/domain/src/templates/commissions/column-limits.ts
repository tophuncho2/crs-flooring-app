/**
 * Length limit for the free-text `notes` column on TemplateCommission.
 * Mirrors the `@db.VarChar(N)` constraint in `schema.prisma`. Imported by the API
 * validators and UI cells so the cap lives in one TS source.
 */

export const TEMPLATE_COMMISSION_NOTES_MAX = 30
