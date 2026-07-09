import type { Prisma } from "../generated/prisma/client.js"
import type { CertificatesListSort } from "./read-repository.js"

/**
 * Pure certificates list-view `orderBy` builder. Kept free of the Prisma *client*
 * (only `import type`) so it unit-tests without a DB connection.
 * `read-repository` consumes `buildCertificatesOrderBy`; the rest is internal.
 */

export function appendUniqueOrderBy<T>(values: T[], nextValue: T | null | undefined) {
  if (!nextValue) return
  const serialized = JSON.stringify(nextValue)
  if (values.some((value) => JSON.stringify(value) === serialized)) return
  values.push(nextValue)
}

// Single source of truth for how each sortable field maps to a Prisma orderBy
// clause. `entity` sorts through the linked entity's name (`entity.entity`);
// everything else is a plain scalar sort. Returns `undefined` for unknown fields
// so the caller can skip them.
export function certificateFieldOrderBy(
  field: string,
  direction: Prisma.SortOrder,
): Prisma.CertificateOrderByWithRelationInput | undefined {
  switch (field) {
    case "name":
      return { name: direction }
    case "entity":
      return { entity: { entity: direction } }
    case "expirationDate":
      return { expirationDate: direction }
    case "createdAt":
      return { createdAt: direction }
    case "updatedAt":
      return { updatedAt: direction }
    default:
      return undefined
  }
}

/**
 * Builds the certificates list-view `orderBy`. No Sort UI ships yet, so the list
 * falls through to its server default of `expirationDate ASC` (soonest first;
 * NULLS LAST under ASC). The plumbing is wired dormant for a future Sort tool.
 * Multiple columns compose an ordered chain (highest priority first); `id` is
 * always the stable final tiebreak, mirroring its lead direction.
 */
export function buildCertificatesOrderBy(
  sort: CertificatesListSort | undefined,
): Prisma.CertificateOrderByWithRelationInput[] {
  const entries = sort?.entries ?? []
  const orderBy: Prisma.CertificateOrderByWithRelationInput[] = []

  for (const entry of entries) {
    appendUniqueOrderBy(orderBy, certificateFieldOrderBy(entry.field, entry.direction))
  }

  // Default order when no valid column was applied (nothing selected, or every
  // selected field was unknown and dropped): soonest-to-expire first.
  if (orderBy.length === 0) {
    appendUniqueOrderBy(orderBy, { expirationDate: "asc" })
  }

  const tiebreakDirection: Prisma.SortOrder = entries[0]?.direction ?? "asc"
  appendUniqueOrderBy(orderBy, { id: tiebreakDirection })

  return orderBy
}
