/**
 * Length limits for short free-text columns on
 * FlooringImportStagedInventoryRow. Mirrors the `@db.VarChar(N)`
 * constraints in `schema.prisma`. Imported by the API validators and
 * UI cells so the cap lives in one TS source.
 */

export const STAGED_INVENTORY_ROW_ROLL_NUMBER_MAX = 30
export const STAGED_INVENTORY_ROW_DYE_LOT_MAX = 30
export const STAGED_INVENTORY_ROW_LOCATION_MAX = 30
export const STAGED_INVENTORY_ROW_NOTE_MAX = 30
