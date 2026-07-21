/**
 * Length limit for the short free-text column on TemplateEntityInvolvement.
 * Mirrors the `@db.VarChar(N)` constraint in `schema.prisma`. Imported by the
 * API validators and UI cells so the cap lives in one TS source.
 */

export const TEMPLATE_ENTITY_INVOLVEMENT_TYPE_MAX = 40
