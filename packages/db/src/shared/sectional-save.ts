import type { Prisma } from "@prisma/client"
import { withDatabaseTransaction } from "../client.js"

/**
 * Standard transaction wrapper for sectional-save patterns.
 *
 * Opens a transaction, applies a parent-row lock, then runs the caller's
 * work within the locked transaction. Every sectional-save use case
 * (warehouse sections-with-locations, future imports diffs, work order
 * item diffs, template item diffs) should use this wrapper.
 *
 * Caller provides:
 *  - parentLock: a closure that locks the parent row (e.g., (tx) =>
 *    lockFlooringWarehouseRow(tx, warehouseId))
 *  - work: the transactional logic (typically a call to an apply*Diff
 *    data-layer primitive)
 *
 * Usage:
 *   const result = await withSectionalSave(
 *     (tx) => lockFlooringWarehouseRow(tx, warehouseId),
 *     (tx) => applySectionsWithLocationsDiff(tx, diffInput),
 *   )
 */
export async function withSectionalSave<T>(
  parentLock: (tx: Prisma.TransactionClient) => Promise<void>,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return withDatabaseTransaction(async (tx) => {
    await parentLock(tx)
    return work(tx)
  })
}
