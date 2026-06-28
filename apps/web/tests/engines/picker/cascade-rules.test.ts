import { describe, it, expect } from "vitest"
import type {
  EntityOption,
  PropertyOption,
  TemplateOption,
} from "@builders/domain"
import {
  applyEntitySelection,
  applyPropertySelection,
  applyTemplateSelection,
} from "@/engines/picker"

function entityOption(overrides: Partial<EntityOption> = {}): EntityOption {
  return {
    id: "entity-1",
    entity: "Acme Property Mgmt",
    streetAddress: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    fullAddress: "",
    types: [],
    ...overrides,
  }
}

function property(overrides: Partial<PropertyOption> = {}): PropertyOption {
  return {
    id: "prop-1",
    name: "Maple Court",
    address: "1 Main St, Austin, TX",
    streetAddress: "1 Main St",
    city: "Austin",
    state: "TX",
    postalCode: "78701",
    instructions: "",
    entityId: "entity-1",
    entityName: "Acme Property Mgmt",
    ...overrides,
  }
}

function template(overrides: Partial<TemplateOption> = {}): TemplateOption {
  return {
    id: "tmpl-1",
    unitType: "2BR / 2BA",
    jobTypeName: "Turn",
    description: "",
    itemsCount: 3,
    ...overrides,
  }
}

describe("applyEntitySelection", () => {
  it("sets the entity and clears every downstream step", () => {
    expect(applyEntitySelection(entityOption())).toEqual({
      entityId: "entity-1",
      entityLabel: "Acme Property Mgmt",
      propertyId: null,
      propertyLabel: null,
      templateId: null,
      templateLabel: null,
    })
  })

  it("clears the entity (and downstream) when cleared", () => {
    expect(applyEntitySelection(null)).toEqual({
      entityId: null,
      entityLabel: null,
      propertyId: null,
      propertyLabel: null,
      templateId: null,
      templateLabel: null,
    })
  })
})

describe("applyPropertySelection", () => {
  it("sets the property, clears the template, and back-fills the linked entity", () => {
    expect(applyPropertySelection(property())).toEqual({
      propertyId: "prop-1",
      propertyLabel: "Maple Court",
      entityId: "entity-1",
      entityLabel: "Acme Property Mgmt",
      templateId: null,
      templateLabel: null,
    })
  })

  it("omits the entity keys when the property has no linked entity (leaves prior entity untouched)", () => {
    const patch = applyPropertySelection(
      property({ entityId: null, entityName: null }),
    )
    expect(patch).toEqual({
      propertyId: "prop-1",
      propertyLabel: "Maple Court",
      templateId: null,
      templateLabel: null,
    })
    expect("entityId" in patch).toBe(false)
    expect("entityLabel" in patch).toBe(false)
  })
})

describe("applyTemplateSelection", () => {
  it("sets the leaf without clearing anything", () => {
    expect(applyTemplateSelection(template())).toEqual({
      templateId: "tmpl-1",
      templateLabel: "2BR / 2BA",
    })
  })

  it("falls back to an em dash for a blank unit type", () => {
    expect(applyTemplateSelection(template({ unitType: "" }))).toEqual({
      templateId: "tmpl-1",
      templateLabel: "—",
    })
  })

  it("clears the leaf when cleared", () => {
    expect(applyTemplateSelection(null)).toEqual({
      templateId: null,
      templateLabel: null,
    })
  })
})
