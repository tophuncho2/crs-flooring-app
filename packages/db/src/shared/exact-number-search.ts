/**
 * Exact-match filter for a record-# search bar (the exact-number-search standard).
 *
 * Strips non-digits so "IMP-5" and "5" both resolve to 5, then returns a Prisma
 * int-equals clause for the row's generated `*NumberInt` btree column. Non-numeric
 * input yields the `-1` sentinel: every `*NumberInt` sequence is strictly positive,
 * so a junk term resolves to a value no row can hold — the bar returns zero rows
 * rather than every row.
 *
 * The field name stays at the call site (`clauses.push({ inventoryNumberInt: … })`
 * or `where.paymentNumberInt = …`); this owns only the strip → parse → sentinel →
 * equals core, so the sentinel/parse rule lives in exactly one place.
 */
export function exactNumberIntEquals(raw: string): { equals: number } {
  const digits = raw.replace(/\D/g, "")
  const parsed = digits.length > 0 ? Number.parseInt(digits, 10) : Number.NaN
  return { equals: Number.isInteger(parsed) ? parsed : -1 }
}
