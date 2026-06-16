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
 * nothing to step from, so they short-circuit before calling this.
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
