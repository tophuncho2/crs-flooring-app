// @vitest-environment jsdom

import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import type {
  ManagementCompanyOption,
  PropertyOption,
  TemplateOption,
} from "@builders/domain"
import { useCascadePickerController } from "@/engines/cascade-picker"

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
  } as TemplateOption
}

describe("useCascadePickerController", () => {
  it("auto-links the management company when a property carrying one is selected", () => {
    const { result } = renderHook(() => useCascadePickerController())

    act(() => result.current.selectProperty(property()))

    expect(result.current.propertyId).toBe("prop-1")
    expect(result.current.propertyLabel).toBe("Maple Court")
    expect(result.current.managementCompanyId).toBe("mc-1")
    expect(result.current.managementCompanyLabel).toBe("Acme Property Mgmt")
  })

  it("leaves the management company empty when the property has no linked MC", () => {
    const { result } = renderHook(() => useCascadePickerController())

    act(() =>
      result.current.selectProperty(
        property({ managementCompanyId: null, managementCompanyName: null }),
      ),
    )

    expect(result.current.propertyId).toBe("prop-1")
    expect(result.current.managementCompanyId).toBeNull()
    expect(result.current.managementCompanyLabel).toBeNull()
  })

  it("preserves an existing management company when the picked property shares it", () => {
    const { result } = renderHook(() => useCascadePickerController())

    act(() => result.current.selectManagementCompany(mc()))
    act(() => result.current.selectProperty(property()))

    expect(result.current.managementCompanyId).toBe("mc-1")
    expect(result.current.propertyId).toBe("prop-1")
  })

  it("clears the template when the property changes", () => {
    const { result } = renderHook(() => useCascadePickerController())

    act(() => result.current.selectProperty(property()))
    act(() => result.current.selectTemplate(template()))
    expect(result.current.templateId).toBe("tmpl-1")

    act(() => result.current.selectProperty(property({ id: "prop-2", name: "Oak Lane" })))
    expect(result.current.propertyId).toBe("prop-2")
    expect(result.current.templateId).toBeNull()
    expect(result.current.templateLabel).toBeNull()
  })

  it("clears property and template when the management company changes", () => {
    const { result } = renderHook(() => useCascadePickerController())

    act(() => result.current.selectProperty(property()))
    act(() => result.current.selectTemplate(template()))

    act(() => result.current.selectManagementCompany(mc({ id: "mc-2", name: "Other MC" })))

    expect(result.current.managementCompanyId).toBe("mc-2")
    expect(result.current.propertyId).toBeNull()
    expect(result.current.propertyLabel).toBeNull()
    expect(result.current.templateId).toBeNull()
  })

  it("reset clears every selection", () => {
    const { result } = renderHook(() => useCascadePickerController())

    act(() => result.current.selectProperty(property()))
    act(() => result.current.selectTemplate(template()))
    expect(result.current.hasSelections).toBe(true)

    act(() => result.current.reset())

    expect(result.current.hasSelections).toBe(false)
    expect(result.current.managementCompanyId).toBeNull()
    expect(result.current.propertyId).toBeNull()
    expect(result.current.templateId).toBeNull()
  })
})
