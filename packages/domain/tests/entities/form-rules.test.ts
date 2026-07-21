import { describe, expect, it } from "vitest"
import {
  toEntityForm,
  validateEntityForm,
} from "../../src/entities/form-rules.js"
import type {
  EntityDetail,
  EntityForm,
} from "../../src/entities/types.js"

function form(overrides: Partial<EntityForm> = {}): EntityForm {
  return {
    entity: "Acme",
    streetAddress: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    typeId: null,
    ...overrides,
  }
}

function detail(overrides: Partial<EntityDetail> = {}): EntityDetail {
  return {
    id: "entity-1",
    updatedAt: "2026-05-26T00:00:00.000Z",
    entity: "Acme",
    streetAddress: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
    phone: "555-1212",
    email: "a@b.com",
    fullAddress: "1 Main St, Austin, TX, 78701",
    type: { id: "type-1", type: "Vendor", color: "SLATE" },
    ...overrides,
  }
}

describe("validateEntityForm", () => {
  it("returns no error for a valid form", () => {
    expect(validateEntityForm(form())).toBe("")
  })

  it("flags an empty name", () => {
    expect(validateEntityForm(form({ entity: "" }))).toBe("Entity name is required")
  })

  it("flags a whitespace-only name", () => {
    expect(validateEntityForm(form({ entity: "   " }))).toBe("Entity name is required")
  })
})

describe("toEntityForm", () => {
  it("copies every form field from the detail record", () => {
    expect(toEntityForm(detail())).toEqual({
      entity: "Acme",
      streetAddress: "1 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
      phone: "555-1212",
      email: "a@b.com",
      typeId: "type-1",
    })
  })
})
