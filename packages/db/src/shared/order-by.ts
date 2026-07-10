import type { Prisma } from "../generated/prisma/client.js"

/**
 * Shared list-view `orderBy` primitives. Kept free of the Prisma *client* (only
 * `import type`) so every builder that reuses these unit-tests without a DB
 * connection. The former per-module copies of `appendUniqueOrderBy` (8
 * byte-identical duplicates) now import from here.
 */

/**
 * Push `nextValue` onto `values` unless it is null/undefined or a structurally
 * identical clause is already present (JSON-serialized equality). Lets builders
 * append user columns + trailing tiebreaks without producing duplicate clauses.
 */
export function appendUniqueOrderBy<T>(values: T[], nextValue: T | null | undefined) {
  if (!nextValue) return
  const serialized = JSON.stringify(nextValue)
  if (values.some((value) => JSON.stringify(value) === serialized)) return
  values.push(nextValue)
}

/**
 * The uniform invisible base order for every Sort-tool list view: newest first
 * (`createdAt desc`) with `id desc` as the load-bearing final tiebreak so
 * offset+count pagination stays deterministic. Applied ONLY when the user has
 * selected no valid sort column — it is never seeded into client sort state, so
 * nothing reads as "sorted" on load. Structurally narrow (just `createdAt`/`id`)
 * so it spreads into any model's `OrderByWithRelationInput[]`; each builder
 * returns a fresh copy per call.
 */
export const DEFAULT_LIST_ORDER: ReadonlyArray<{
  createdAt?: Prisma.SortOrder
  id?: Prisma.SortOrder
}> = [{ createdAt: "desc" }, { id: "desc" }]
