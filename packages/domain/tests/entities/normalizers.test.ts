import { describe, expect, it } from "vitest"
import {
  normalizeEntity,
  normalizeEntityListRow,
  normalizeEntityOption,
} from "../../src/entities/normalizers.js"

describe("normalizeEntity", () => {
  const base = {
    id: "entity-1",
    createdAt: "2026-05-20T00:00:00.000Z",
    updatedAt: "2026-05-26T00:00:00.000Z",
    entity: "Acme",
    streetAddress: "1 Main St",
    city: "Austin",
    state: "TX",
    postalCode: "78701",
    phone: "555-1212",
    email: "a@b.com",
    _count: { properties: 0 },
  }

  it("converts a Date updatedAt to an ISO string", () => {
    const result = normalizeEntity({
      ...base,
      updatedAt: new Date("2026-05-26T12:00:00.000Z"),
    })
    expect(result.updatedAt).toBe("2026-05-26T12:00:00.000Z")
  })

  it("converts a Date createdAt to an ISO string", () => {
    const result = normalizeEntity({
      ...base,
      createdAt: new Date("2026-05-20T08:00:00.000Z"),
    })
    expect(result.createdAt).toBe("2026-05-20T08:00:00.000Z")
  })

  it("coalesces null fields, maps postalCode to zip, and builds the full address", () => {
    const result = normalizeEntity({
      ...base,
      streetAddress: null,
      phone: null,
      email: null,
    })
    expect(result).toMatchObject({
      streetAddress: "",
      phone: "",
      email: "",
      zip: "78701",
      fullAddress: "Austin, TX, 78701",
    })
  })
})

describe("normalizeEntityListRow", () => {
  it("extracts propertyCount from _count.properties", () => {
    const result = normalizeEntityListRow({
      id: "entity-1",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-26T00:00:00.000Z",
      entity: "Acme",
      streetAddress: "1 Main St",
      city: "Austin",
      state: "TX",
      postalCode: "78701",
      phone: null,
      email: null,
      _count: { properties: 7 },
    })
    expect(result.propertyCount).toBe(7)
    expect(result.fullAddress).toBe("1 Main St, Austin, TX, 78701")
  })
})

describe("normalizeEntityOption", () => {
  it("maps id, entity, contact + address fields and coalesces nulls", () => {
    expect(
      normalizeEntityOption({
        id: "entity-1",
        entity: "Acme",
        streetAddress: "1 Main St",
        city: "Austin",
        state: "TX",
        postalCode: "78701",
        phone: null,
        email: null,
      }),
    ).toEqual({
      id: "entity-1",
      entity: "Acme",
      streetAddress: "1 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
      phone: "",
      email: "",
      fullAddress: "1 Main St, Austin, TX, 78701",
      type: null,
    })
  })

  it("flattens the linked entityType to a single ref (null when absent)", () => {
    expect(
      normalizeEntityOption({
        id: "entity-1",
        entity: "Acme",
        streetAddress: "1 Main St",
        city: "Austin",
        state: "TX",
        postalCode: "78701",
        phone: null,
        email: null,
        entityType: { id: "type-1", type: "Vendor", color: "SLATE" },
      }).type,
    ).toEqual({ id: "type-1", type: "Vendor", color: "SLATE" })
  })
})
