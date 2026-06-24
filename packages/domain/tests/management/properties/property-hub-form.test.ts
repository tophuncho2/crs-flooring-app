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
import type { EntityForm } from "../../../src/management/entities/types.js"

function entityFields(overrides: Partial<EntityForm> = {}): EntityForm {
  return {
    entity: "Acme",
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
  it("rejects when neither an entity nor a property is being created", () => {
    const form: CreatePropertyHubForm = {
      entity: { mode: "none" },
      property: { mode: "none" },
    }
    expect(validateCreatePropertyHubForm(form)).toBe(PROPERTY_HUB_NO_ACTIONS_MESSAGE)
  })

  it("rejects linking an entity without also creating a property", () => {
    const form: CreatePropertyHubForm = {
      entity: { mode: "link", id: "entity-1" },
      property: { mode: "none" },
    }
    expect(validateCreatePropertyHubForm(form)).toBe(PROPERTY_HUB_LINK_REQUIRES_PROPERTY_MESSAGE)
  })

  it("delegates to the entity validator when creating one", () => {
    const form: CreatePropertyHubForm = {
      entity: { mode: "create", fields: entityFields({ entity: "  " }) },
      property: { mode: "create", fields: propertyFields() },
    }
    expect(validateCreatePropertyHubForm(form)).toBe("Entity name is required")
  })

  it("rejects a blank property name when creating a property", () => {
    const form: CreatePropertyHubForm = {
      entity: { mode: "none" },
      property: { mode: "create", fields: propertyFields({ name: "   " }) },
    }
    expect(validateCreatePropertyHubForm(form)).toBe(PROPERTY_NAME_REQUIRED_MESSAGE)
  })

  it("accepts creating a property only", () => {
    const form: CreatePropertyHubForm = {
      entity: { mode: "none" },
      property: { mode: "create", fields: propertyFields() },
    }
    expect(validateCreatePropertyHubForm(form)).toBe("")
  })

  it("accepts linking an entity while creating a property", () => {
    const form: CreatePropertyHubForm = {
      entity: { mode: "link", id: "entity-1" },
      property: { mode: "create", fields: propertyFields() },
    }
    expect(validateCreatePropertyHubForm(form)).toBe("")
  })

  it("accepts creating both an entity and a property", () => {
    const form: CreatePropertyHubForm = {
      entity: { mode: "create", fields: entityFields() },
      property: { mode: "create", fields: propertyFields() },
    }
    expect(validateCreatePropertyHubForm(form)).toBe("")
  })

  it("accepts creating an entity only", () => {
    const form: CreatePropertyHubForm = {
      entity: { mode: "create", fields: entityFields() },
      property: { mode: "none" },
    }
    expect(validateCreatePropertyHubForm(form)).toBe("")
  })
})
