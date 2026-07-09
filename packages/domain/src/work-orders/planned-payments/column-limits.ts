/**
 * Length limits for short free-text columns on FlooringWorkOrderPlannedPayment.
 * Mirrors the `@db.VarChar(N)` constraints in `schema.prisma`. Imported
 * by the API validators and UI cells so the cap lives in one TS source.
 */

export const WORK_ORDER_PLANNED_PAYMENT_NOTES_MAX = 30
