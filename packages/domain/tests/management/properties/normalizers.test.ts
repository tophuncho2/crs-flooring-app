import { describe, expect, it } from "vitest"
import {
  normalizeProperty,
  normalizePropertyListRow,
  normalizePropertyOption,
} from "../../../src/management/properties/normalizers.js"

describe("normalizeProperty", () => {
  const base = {
    id: "prop-1",
    propertyNumber: "PROP-1",
    createdAt: "2026-05-20T00:00:00.000Z",
    updatedAt: "2026-05-26T00:00:00.000Z",
    name: "Maple Court",
    streetAddress: "1 Main St",
    city: "Austin",
    state: "TX",
    postalCode: "78701",
    phone: "555-1212",
    email: "a@b.com",
    instructions: "Gate 1234",
    createdBy: "creator@example.com",
    updatedBy: "editor@example.com",
    managementCompany: { id: "mc-1", name: "Acme" },
  }

  it("converts a Date updatedAt to an ISO string", () => {
    const result = normalizeProperty({ ...base, updatedAt: new Date("2026-05-26T12:00:00.000Z") })
    expect(result.updatedAt).toBe("2026-05-26T12:00:00.000Z")
  })

  it("passes through an already-string updatedAt", () => {
    expect(normalizeProperty(base).updatedAt).toBe("2026-05-26T00:00:00.000Z")
  })

  it("converts a Date createdAt to an ISO string", () => {
    const result = normalizeProperty({ ...base, createdAt: new Date("2026-05-20T08:00:00.000Z") })
    expect(result.createdAt).toBe("2026-05-20T08:00:00.000Z")
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

  it("passes the property number through", () => {
    expect(normalizeProperty(base).propertyNumber).toBe("PROP-1")
  })

  it("passes the actor emails through, coalescing missing ones to null", () => {
    const result = normalizeProperty(base)
    expect(result.createdBy).toBe("creator@example.com")
    expect(result.updatedBy).toBe("editor@example.com")

    const blank = normalizeProperty({ ...base, createdBy: null, updatedBy: null })
    expect(blank.createdBy).toBeNull()
    expect(blank.updatedBy).toBeNull()
  })

  it("defaults the stepper neighbors to null when none are given", () => {
    const result = normalizeProperty(base)
    expect(result.previousProperty).toBeNull()
    expect(result.nextProperty).toBeNull()
  })

  it("folds provided previous/next neighbors into the record", () => {
    const result = normalizeProperty(base, {
      previousProperty: { id: "prop-0" },
      nextProperty: { id: "prop-2" },
    })
    expect(result.previousProperty).toEqual({ id: "prop-0" })
    expect(result.nextProperty).toEqual({ id: "prop-2" })
  })
})

describe("normalizePropertyListRow", () => {
  it("extracts templateCount from _count.templates", () => {
    const result = normalizePropertyListRow({
      id: "prop-1",
      propertyNumber: "PROP-1",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-26T00:00:00.000Z",
      name: "Maple Court",
      streetAddress: "1 Main St",
      city: "Austin",
      state: "TX",
      postalCode: "78701",
      phone: null,
      email: null,
      createdBy: "creator@example.com",
      updatedBy: null,
      managementCompany: null,
      _count: { templates: 4 },
    })
    expect(result.propertyNumber).toBe("PROP-1")
    expect(result.templateCount).toBe(4)
    expect(result.fullAddress).toBe("1 Main St, Austin, TX, 78701")
    expect(result.createdBy).toBe("creator@example.com")
    expect(result.updatedBy).toBeNull()
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
      managementCompany: { name: "Acme Property Mgmt" },
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
      managementCompanyName: "Acme Property Mgmt",
    })
  })

  it("coalesces a missing management company name to null", () => {
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
    expect(result.managementCompanyName).toBeNull()
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
