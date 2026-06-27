import { describe, expect, it } from "vitest"
import {
  toPropertyPrimaryForm,
  validatePropertyPrimaryForm,
} from "../../../src/management/properties/form-rules.js"
import type {
  PropertyDetailRecord,
  PropertyPrimaryForm,
} from "../../../src/management/properties/types.js"

function form(overrides: Partial<PropertyPrimaryForm> = {}): PropertyPrimaryForm {
  return {
    name: "Maple Court",
    streetAddress: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    instructions: "",
    color: "SLATE",
    entityId: "",
    ...overrides,
  }
}

function detail(overrides: Partial<PropertyDetailRecord> = {}): PropertyDetailRecord {
  return {
    id: "prop-1",
    updatedAt: "2026-05-26T00:00:00.000Z",
    name: "Maple Court",
    streetAddress: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
    phone: "555-1212",
    email: "a@b.com",
    instructions: "Gate code 1234",
    fullAddress: "1 Main St, Austin, TX, 78701",
    color: "BLUE",
    entity: { id: "entity-1", entity: "Acme" },
    ...overrides,
  }
}

describe("validatePropertyPrimaryForm", () => {
  it("returns no error for a valid form", () => {
    expect(validatePropertyPrimaryForm(form())).toBe("")
  })

  it("flags an empty name", () => {
    expect(validatePropertyPrimaryForm(form({ name: "" }))).toBe("Property name is required")
  })

  it("flags a whitespace-only name", () => {
    expect(validatePropertyPrimaryForm(form({ name: "   " }))).toBe("Property name is required")
  })
})

describe("toPropertyPrimaryForm", () => {
  it("copies every primary field from the detail record", () => {
    expect(toPropertyPrimaryForm(detail())).toEqual({
      name: "Maple Court",
      streetAddress: "1 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
      phone: "555-1212",
      email: "a@b.com",
      instructions: "Gate code 1234",
      color: "BLUE",
      entityId: "entity-1",
    })
  })

  it("uses the entity id when present", () => {
    expect(toPropertyPrimaryForm(detail()).entityId).toBe("entity-1")
  })

  it("falls back to an empty string when there is no entity", () => {
    expect(toPropertyPrimaryForm(detail({ entity: null })).entityId).toBe("")
  })
})
