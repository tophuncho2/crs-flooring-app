import { describe, it, expect } from "vitest"
import type {
  ManagementCompanyOption,
  PropertyOption,
  TemplateOption,
} from "@builders/domain"
import {
  applyManagementCompanySelection,
  applyPropertySelection,
  applyTemplateSelection,
} from "@/engines/picker"

function mc(overrides: Partial<ManagementCompanyOption> = {}): ManagementCompanyOption {
  return { id: "mc-1", name: "Acme Property Mgmt", ...overrides }
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
    managementCompanyId: "mc-1",
    managementCompanyName: "Acme Property Mgmt",
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

describe("applyManagementCompanySelection", () => {
  it("sets the MC and clears every downstream step", () => {
    expect(applyManagementCompanySelection(mc())).toEqual({
      managementCompanyId: "mc-1",
      managementCompanyLabel: "Acme Property Mgmt",
      propertyId: null,
      propertyLabel: null,
      templateId: null,
      templateLabel: null,
    })
  })

  it("clears the MC (and downstream) when cleared", () => {
    expect(applyManagementCompanySelection(null)).toEqual({
      managementCompanyId: null,
      managementCompanyLabel: null,
      propertyId: null,
      propertyLabel: null,
      templateId: null,
      templateLabel: null,
    })
  })
})

describe("applyPropertySelection", () => {
  it("sets the property, clears the template, and back-fills the linked MC", () => {
    expect(applyPropertySelection(property())).toEqual({
      propertyId: "prop-1",
      propertyLabel: "Maple Court",
      managementCompanyId: "mc-1",
      managementCompanyLabel: "Acme Property Mgmt",
      templateId: null,
      templateLabel: null,
    })
  })

  it("omits the MC keys when the property has no linked MC (leaves prior MC untouched)", () => {
    const patch = applyPropertySelection(
      property({ managementCompanyId: null, managementCompanyName: null }),
    )
    expect(patch).toEqual({
      propertyId: "prop-1",
      propertyLabel: "Maple Court",
      templateId: null,
      templateLabel: null,
    })
    expect("managementCompanyId" in patch).toBe(false)
    expect("managementCompanyLabel" in patch).toBe(false)
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
