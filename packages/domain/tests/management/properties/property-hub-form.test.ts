import { describe, expect, it } from "vitest"
import {
  EMPTY_PROPERTY_HUB_PROPERTY_FIELDS,
  validateCreatePropertyHubForm,
  type CreatePropertyHubForm,
  type PropertyHubPropertyFields,
} from "../../../src/management/properties/property-hub-form.js"
import {
  PROPERTY_HUB_LINK_REQUIRES_PROPERTY_MESSAGE,
  PROPERTY_HUB_NO_ACTIONS_MESSAGE,
  PROPERTY_NAME_REQUIRED_MESSAGE,
} from "../../../src/management/properties/error-messages.js"
import type { ManagementCompanyForm } from "../../../src/management/management-companies/types.js"

function mcFields(overrides: Partial<ManagementCompanyForm> = {}): ManagementCompanyForm {
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

function propertyFields(overrides: Partial<PropertyHubPropertyFields> = {}): PropertyHubPropertyFields {
  return { ...EMPTY_PROPERTY_HUB_PROPERTY_FIELDS, name: "Maple Court", ...overrides }
}

describe("validateCreatePropertyHubForm", () => {
  it("rejects when neither a management company nor a property is being created", () => {
    const form: CreatePropertyHubForm = {
      managementCompany: { mode: "none" },
      property: { mode: "none" },
    }
    expect(validateCreatePropertyHubForm(form)).toBe(PROPERTY_HUB_NO_ACTIONS_MESSAGE)
  })

  it("rejects linking a management company without also creating a property", () => {
    const form: CreatePropertyHubForm = {
      managementCompany: { mode: "link", id: "mc-1" },
      property: { mode: "none" },
    }
    expect(validateCreatePropertyHubForm(form)).toBe(PROPERTY_HUB_LINK_REQUIRES_PROPERTY_MESSAGE)
  })

  it("delegates to the management-company validator when creating one", () => {
    const form: CreatePropertyHubForm = {
      managementCompany: { mode: "create", fields: mcFields({ name: "  " }) },
      property: { mode: "create", fields: propertyFields() },
    }
    expect(validateCreatePropertyHubForm(form)).toBe("Company name is required")
  })

  it("rejects a blank property name when creating a property", () => {
    const form: CreatePropertyHubForm = {
      managementCompany: { mode: "none" },
      property: { mode: "create", fields: propertyFields({ name: "   " }) },
    }
    expect(validateCreatePropertyHubForm(form)).toBe(PROPERTY_NAME_REQUIRED_MESSAGE)
  })

  it("accepts creating a property only", () => {
    const form: CreatePropertyHubForm = {
      managementCompany: { mode: "none" },
      property: { mode: "create", fields: propertyFields() },
    }
    expect(validateCreatePropertyHubForm(form)).toBe("")
  })

  it("accepts linking a management company while creating a property", () => {
    const form: CreatePropertyHubForm = {
      managementCompany: { mode: "link", id: "mc-1" },
      property: { mode: "create", fields: propertyFields() },
    }
    expect(validateCreatePropertyHubForm(form)).toBe("")
  })

  it("accepts creating both a management company and a property", () => {
    const form: CreatePropertyHubForm = {
      managementCompany: { mode: "create", fields: mcFields() },
      property: { mode: "create", fields: propertyFields() },
    }
    expect(validateCreatePropertyHubForm(form)).toBe("")
  })

  it("accepts creating a management company only", () => {
    const form: CreatePropertyHubForm = {
      managementCompany: { mode: "create", fields: mcFields() },
      property: { mode: "none" },
    }
    expect(validateCreatePropertyHubForm(form)).toBe("")
  })
})
