import { describe, expect, it } from "vitest"
import {
  normalizeProperty,
  normalizePropertyListRow,
  normalizePropertyOption,
} from "../../../src/management/properties/normalizers.js"

describe("normalizeProperty", () => {
  const base = {
    id: "prop-1",
    updatedAt: "2026-05-26T00:00:00.000Z",
    name: "Maple Court",
    streetAddress: "1 Main St",
    city: "Austin",
    state: "TX",
    postalCode: "78701",
    phone: "555-1212",
    email: "a@b.com",
    instructions: "Gate 1234",
    managementCompany: { id: "mc-1", name: "Acme" },
  }

  it("converts a Date updatedAt to an ISO string", () => {
    const result = normalizeProperty({ ...base, updatedAt: new Date("2026-05-26T12:00:00.000Z") })
    expect(result.updatedAt).toBe("2026-05-26T12:00:00.000Z")
  })

  it("passes through an already-string updatedAt", () => {
    expect(normalizeProperty(base).updatedAt).toBe("2026-05-26T00:00:00.000Z")
  })

  it("coalesces null address/contact fields to empty strings", () => {
    const result = normalizeProperty({
      ...base,
      streetAddress: null,
      city: null,
      state: null,
      postalCode: null,
      phone: null,
      email: null,
      instructions: null,
    })
    expect(result).toMatchObject({
      streetAddress: "",
      city: "",
      state: "",
      zip: "",
      phone: "",
      email: "",
      instructions: "",
      fullAddress: "",
    })
  })

  it("maps postalCode to zip and builds the full address line", () => {
    const result = normalizeProperty(base)
    expect(result.zip).toBe("78701")
    expect(result.fullAddress).toBe("1 Main St, Austin, TX, 78701")
  })

  it("drops blank parts from the full address line", () => {
    const result = normalizeProperty({ ...base, streetAddress: null, postalCode: null })
    expect(result.fullAddress).toBe("Austin, TX")
  })

  it("passes the management company through unchanged", () => {
    expect(normalizeProperty(base).managementCompany).toEqual({ id: "mc-1", name: "Acme" })
    expect(normalizeProperty({ ...base, managementCompany: null }).managementCompany).toBeNull()
  })
})

describe("normalizePropertyListRow", () => {
  it("extracts templateCount from _count.templates", () => {
    const result = normalizePropertyListRow({
      id: "prop-1",
      updatedAt: "2026-05-26T00:00:00.000Z",
      name: "Maple Court",
      streetAddress: "1 Main St",
      city: "Austin",
      state: "TX",
      postalCode: "78701",
      phone: null,
      email: null,
      managementCompany: null,
      _count: { templates: 4 },
    })
    expect(result.templateCount).toBe(4)
    expect(result.fullAddress).toBe("1 Main St, Austin, TX, 78701")
  })
})

describe("normalizePropertyOption", () => {
  it("builds the address line and coalesces nulls", () => {
    const result = normalizePropertyOption({
      id: "prop-1",
      name: "Maple Court",
      streetAddress: null,
      city: "Austin",
      state: "TX",
      postalCode: null,
      instructions: null,
      managementCompanyId: "mc-1",
    })
    expect(result).toEqual({
      id: "prop-1",
      name: "Maple Court",
      address: "Austin, TX",
      streetAddress: "",
      city: "Austin",
      state: "TX",
      postalCode: "",
      instructions: "",
      managementCompanyId: "mc-1",
    })
  })

  it("keeps a null managementCompanyId", () => {
    const result = normalizePropertyOption({
      id: "prop-1",
      name: "Maple Court",
      streetAddress: "1 Main St",
      city: "Austin",
      state: "TX",
      postalCode: "78701",
      instructions: "Gate 1234",
      managementCompanyId: null,
    })
    expect(result.managementCompanyId).toBeNull()
  })
})
