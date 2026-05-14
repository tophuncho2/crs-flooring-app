/**
 * Length limits for short free-text columns on FlooringInventory.
 * Mirrors the `@db.VarChar(N)` constraints in `schema.prisma`. Imported
 * by the API validators and UI cells so the cap lives in one TS source.
 */

export const INVENTORY_ROLL_NUMBER_MAX = 30
export const INVENTORY_DYE_LOT_MAX = 30
export const INVENTORY_NOTE_MAX = 30
export const INVENTORY_LOCATION_MAX = 30
export const INVENTORY_INTERNAL_NOTES_MAX = 250
