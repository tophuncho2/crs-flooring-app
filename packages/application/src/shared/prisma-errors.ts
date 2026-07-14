import { Prisma } from "@builders/db"

export { isP2002 } from "@builders/db"

export function isP2025(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025"
  )
}

export function isP2003(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003"
  )
}

// A lowercased, searchable description of the failing foreign key off a P2003 —
// used to attribute the violation to the right form field when a row carries
// several FKs. Returns null when the driver gives no field/constraint detail
// (callers then fall back to their default field).
//
// Prisma 7 exposes the failure under `meta.constraint`, which is an OBJECT with
// one of three shapes: `{ fields: string[] }` (the column names), `{ index }`
// (the constraint name, e.g. `..._paymentPurposeId_fkey`), or `{ foreignKey }`
// (no detail). We also read the legacy `meta.field_name` string (Prisma ≤4) and
// `meta.target` for resilience across driver adapters. Whatever is present is
// flattened to one lowercased haystack for substring matching.
export function p2003FieldName(error: unknown): string | null {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2003"
  ) {
    return null
  }

  const meta = error.meta as
    | {
        field_name?: unknown
        target?: unknown
        constraint?: unknown
      }
    | undefined
  if (!meta) return null

  const parts: string[] = []
  const push = (value: unknown) => {
    if (typeof value === "string") parts.push(value)
    else if (Array.isArray(value)) {
      for (const item of value) if (typeof item === "string") parts.push(item)
    }
  }

  push(meta.field_name)
  push(meta.target)
  const constraint = meta.constraint
  if (typeof constraint === "string") {
    push(constraint)
  } else if (constraint && typeof constraint === "object") {
    const c = constraint as { fields?: unknown; index?: unknown }
    push(c.fields)
    push(c.index)
  }

  return parts.length > 0 ? parts.join(" ").toLowerCase() : null
}
