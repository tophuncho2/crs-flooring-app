/**
 * Length limits for short free-text columns on FlooringWorkOrder.
 * Mirrors the `@db.VarChar(N)` constraints in `schema.prisma`. Imported
 * by the API validators and UI cells so the cap lives in one TS source.
 */

export const WO_DESCRIPTION_MAX = 120
export const WO_UNIT_NUMBER_MAX = 30
export const WO_UNIT_TYPE_MAX = 40
export const WO_CUSTOMER_NAME_MAX = 100
export const WO_INTERNAL_NOTES_MAX = 250
export const WO_INSTALLER_INSTRUCTIONS_MAX = 500
export const WO_PURCHASE_ORDER_NUMBER_MAX = 50
