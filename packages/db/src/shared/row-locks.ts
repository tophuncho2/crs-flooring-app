import type { Prisma } from "@prisma/client"

/**
 * Row-level locking helpers for sectional-save patterns.
 *
 * Each function locks the parent row in a transaction so concurrent saves
 * cannot interleave "read current state → compute diff → apply" operations
 * and produce conflicting results.
 *
 * Prisma does not expose SELECT ... FOR UPDATE through its query builder,
 * so these helpers use $queryRaw. Each lock function corresponds to a
 * specific parent entity table. Add new lock functions here as additional
 * sectional-save modules are hardened.
 *
 * Usage (inside withDatabaseTransaction):
 *   await lockFlooringWarehouseRow(tx, warehouseId)
 *   // ... read current state, apply diff, etc
 */

export async function lockFlooringWarehouseRow(
  tx: Prisma.TransactionClient,
  warehouseId: string,
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM flooring_warehouse WHERE id = ${warehouseId} FOR UPDATE`
}
