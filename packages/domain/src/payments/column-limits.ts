// Length caps for payments free-text columns. Enforced at the API boundary and
// mirrored by the DB VarChar sizes (single source of truth for both).

/** Max length of the free-text `paymentMethod` label (matches VARCHAR(50)). */
export const PAYMENT_METHOD_MAX = 50

/** Max length of the `storePhone` column (matches VARCHAR(20); phone is stored canonical digits-only). */
export const STORE_PHONE_MAX = 20

/** Max length of the free-text `receiptNumber` identifier (matches VARCHAR(100)). */
export const RECEIPT_NUMBER_MAX = 100
