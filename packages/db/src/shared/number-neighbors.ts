/**
 * Shared data primitive for the record-view shell stepper.
 *
 * Every record that carries a generated numeric sort key (`inventoryNumberInt`,
 * `templateNumberInt`, `workOrderNumberInt`) resolves its prev/next neighbors
 * the same way: the row with the largest key `< current` (previous) and the
 * smallest key `> current` (next), in the global number order. This builds that
 * pair of `where` + `orderBy` clauses once so the directionality
 * (`lt`/`desc` vs `gt`/`asc`) lives in one place and can't drift between repos.
 *
 * Each repository composes the returned clauses with its own typed `findFirst` +
 * `select`, so per-model neighbor selects stay intact (inventory carries
 * `warehouseId` to sync the header across warehouses; templates / work orders
 * only need `id`). Two single-row lookups on the column's index.
 *
 * Callers must guard the null key themselves (no generated value yet) — there is
 * nothing to step from, so they short-circuit before calling this. That guard is
 * also available for free via `resolveNumberNeighbors` below.
 */
export function numberNeighborQueries<F extends string>(
  field: F,
  currentInt: number,
): {
  previous: { where: Record<F, { lt: number }>; orderBy: Record<F, "desc"> }
  next: { where: Record<F, { gt: number }>; orderBy: Record<F, "asc"> }
} {
  return {
    previous: {
      where: { [field]: { lt: currentInt } } as Record<F, { lt: number }>,
      orderBy: { [field]: "desc" } as Record<F, "desc">,
    },
    next: {
      where: { [field]: { gt: currentInt } } as Record<F, { gt: number }>,
      orderBy: { [field]: "asc" } as Record<F, "asc">,
    },
  }
}

/**
 * Wrapper that runs the full neighbor resolve every read-repo shares: guard the
 * null key, build the prev/next clauses via `numberNeighborQueries`, then run the
 * two single-row lookups concurrently.
 *
 * The Prisma delegate stays OUT of the signature — callers pass a `find` callback
 * that supplies their own typed `findFirst` + `select`, so per-model projections
 * ride along in the row type `T` (e.g. inventory's `warehouseId`) with no special
 * param. The caller re-keys the generic `{ previous, next }` into its own module
 * shape. Payments and imports are already-onboarded callers (imports passes a
 * non-null autoincrement, so its guard simply never trips).
 */
export async function resolveNumberNeighbors<F extends string, T>(
  field: F,
  currentInt: number | null,
  find: (q: {
    where: Record<F, { lt: number } | { gt: number }>
    orderBy: Record<F, "desc" | "asc">
  }) => Promise<T | null>,
): Promise<{ previous: T | null; next: T | null }> {
  if (currentInt === null) return { previous: null, next: null }

  const { previous, next } = numberNeighborQueries(field, currentInt)
  const [prev, nxt] = await Promise.all([find(previous), find(next)])
  return { previous: prev, next: nxt }
}
