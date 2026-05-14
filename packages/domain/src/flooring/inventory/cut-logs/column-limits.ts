/**
 * Length limits for short free-text columns on FlooringCutLog.
 * Mirrors the `@db.VarChar(N)` constraints in `schema.prisma`. Imported
 * by the API validators and UI cells so the cap lives in one TS source.
 *
 * Only user-input columns are exported here. The snapshot columns
 * (rollNumber, dyeLot, inventoryNote, location) are server-set from the
 * parent inventory row at cut-log creation, so they have no user-input
 * path and need no validator/UI wiring. Their VarChar caps are still
 * enforced at the database level via `schema.prisma`.
 */

export const CUT_LOG_NOTES_MAX = 30
