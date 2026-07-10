/**
 * Collapse a clause array into a Prisma `where`: none → `undefined` (no filter),
 * one → the bare clause, many → `{ AND: clauses }`.
 *
 * Unwrapping the single clause keeps the emitted object minimal; Prisma treats
 * `{ AND: [x] }` and `x` identically, so callers that always wrap are query-
 * equivalent. The clause type stays at the call site via the generic — every
 * caller passes a `Prisma.*WhereInput[]`, whose `AND` field makes the wrap sound.
 */
export function combineAnd<W>(clauses: W[]): W | undefined {
  if (clauses.length === 0) return undefined
  if (clauses.length === 1) return clauses[0]
  return { AND: clauses } as W
}
