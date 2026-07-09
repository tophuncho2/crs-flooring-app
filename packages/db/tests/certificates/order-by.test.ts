import { describe, expect, it } from "vitest"
import {
  buildCertificatesOrderBy,
  certificateFieldOrderBy,
} from "../../src/certificates/order-by.js"

/** The fields a future certificates Sort menu would expose, with the Prisma
 * clause each must produce. Kept here as the executable spec for the data
 * layer — the plumbing is wired dormant ahead of the Sort UI. */
const FIELD_CLAUSE: Record<string, Record<string, unknown>> = {
  name: { name: "asc" },
  entity: { entity: { entity: "asc" } },
  expirationDate: { expirationDate: "asc" },
  createdAt: { createdAt: "asc" },
  updatedAt: { updatedAt: "asc" },
}

const lastKey = (orderBy: Array<Record<string, unknown>>) =>
  Object.keys(orderBy[orderBy.length - 1])

describe("buildCertificatesOrderBy", () => {
  it("maps every exposed field to the correct Prisma clause as the leading sort", () => {
    for (const [field, clause] of Object.entries(FIELD_CLAUSE)) {
      const orderBy = buildCertificatesOrderBy({ entries: [{ field, direction: "asc" }] })
      expect(orderBy[0], `leading clause for ${field}`).toEqual(clause)
    }
  })

  it("resolves the entity relation through entity.entity", () => {
    expect(certificateFieldOrderBy("entity", "desc")).toEqual({ entity: { entity: "desc" } })
  })

  it("skips unknown fields", () => {
    expect(certificateFieldOrderBy("bogus", "asc")).toBeUndefined()
    const orderBy = buildCertificatesOrderBy({ entries: [{ field: "bogus", direction: "asc" }] })
    // No selected field applied → falls to the expirationDate default + id tiebreak.
    expect(orderBy).toEqual([{ expirationDate: "asc" }, { id: "asc" }])
  })

  it("defaults to expirationDate asc + id tiebreak when empty", () => {
    expect(buildCertificatesOrderBy(undefined)).toEqual([
      { expirationDate: "asc" },
      { id: "asc" },
    ])
    expect(buildCertificatesOrderBy({ entries: [] })).toEqual([
      { expirationDate: "asc" },
      { id: "asc" },
    ])
  })

  it("always ends with the id tiebreak mirroring the lead direction", () => {
    const asc = buildCertificatesOrderBy({ entries: [{ field: "name", direction: "asc" }] })
    expect(lastKey(asc)).toEqual(["id"])
    expect(asc[asc.length - 1]).toEqual({ id: "asc" })

    const desc = buildCertificatesOrderBy({ entries: [{ field: "name", direction: "desc" }] })
    expect(desc[desc.length - 1]).toEqual({ id: "desc" })
  })

  it("composes multiple columns in priority order", () => {
    const orderBy = buildCertificatesOrderBy({
      entries: [
        { field: "entity", direction: "asc" },
        { field: "expirationDate", direction: "desc" },
      ],
    })
    expect(orderBy).toEqual([
      { entity: { entity: "asc" } },
      { expirationDate: "desc" },
      { id: "asc" },
    ])
  })
})
