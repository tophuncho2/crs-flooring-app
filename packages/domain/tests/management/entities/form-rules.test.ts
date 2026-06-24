import { describe, expect, it } from "vitest"
import {
  toManagementCompanyForm,
  validateManagementCompanyForm,
} from "../../../src/management/management-companies/form-rules.js"
import type {
  ManagementCompanyDetail,
  ManagementCompanyForm,
} from "../../../src/management/management-companies/types.js"

function form(overrides: Partial<ManagementCompanyForm> = {}): ManagementCompanyForm {
  return {
    name: "Acme",
    streetAddress: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    ...overrides,
  }
}

function detail(overrides: Partial<ManagementCompanyDetail> = {}): ManagementCompanyDetail {
  return {
    id: "mc-1",
    updatedAt: "2026-05-26T00:00:00.000Z",
    name: "Acme",
    streetAddress: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
    phone: "555-1212",
    email: "a@b.com",
    fullAddress: "1 Main St, Austin, TX, 78701",
    ...overrides,
  }
}

describe("validateManagementCompanyForm", () => {
  it("returns no error for a valid form", () => {
    expect(validateManagementCompanyForm(form())).toBe("")
  })

  it("flags an empty name", () => {
    expect(validateManagementCompanyForm(form({ name: "" }))).toBe("Company name is required")
  })

  it("flags a whitespace-only name", () => {
    expect(validateManagementCompanyForm(form({ name: "   " }))).toBe("Company name is required")
  })
})

describe("toManagementCompanyForm", () => {
  it("copies every form field from the detail record", () => {
    expect(toManagementCompanyForm(detail())).toEqual({
      name: "Acme",
      streetAddress: "1 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
      phone: "555-1212",
      email: "a@b.com",
    })
  })
})
