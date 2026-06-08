import { describe, expect, it } from "vitest"
import {
  normalizeManagementCompany,
  normalizeManagementCompanyListRow,
  normalizeManagementCompanyOption,
} from "../../../src/management/management-companies/normalizers.js"

describe("normalizeManagementCompany", () => {
  const base = {
    id: "mc-1",
    updatedAt: "2026-05-26T00:00:00.000Z",
    name: "Acme",
    streetAddress: "1 Main St",
    city: "Austin",
    state: "TX",
    postalCode: "78701",
    phone: "555-1212",
    email: "a@b.com",
    _count: { properties: 0 },
  }

  it("converts a Date updatedAt to an ISO string", () => {
    const result = normalizeManagementCompany({
      ...base,
      updatedAt: new Date("2026-05-26T12:00:00.000Z"),
    })
    expect(result.updatedAt).toBe("2026-05-26T12:00:00.000Z")
  })

  it("coalesces null fields, maps postalCode to zip, and builds the full address", () => {
    const result = normalizeManagementCompany({
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

describe("normalizeManagementCompanyListRow", () => {
  it("extracts propertyCount from _count.properties", () => {
    const result = normalizeManagementCompanyListRow({
      id: "mc-1",
      updatedAt: "2026-05-26T00:00:00.000Z",
      name: "Acme",
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

describe("normalizeManagementCompanyOption", () => {
  it("returns just id and name", () => {
    expect(normalizeManagementCompanyOption({ id: "mc-1", name: "Acme" })).toEqual({
      id: "mc-1",
      name: "Acme",
    })
  })
})
