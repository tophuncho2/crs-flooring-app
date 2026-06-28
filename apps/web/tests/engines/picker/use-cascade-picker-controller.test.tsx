// @vitest-environment jsdom

import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import type {
  EntityOption,
  PropertyOption,
  TemplateOption,
} from "@builders/domain"
import { useCascadePickerController } from "@/engines/picker"

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
  } as TemplateOption
}

describe("useCascadePickerController", () => {
  it("auto-links the entity when a property carrying one is selected", () => {
    const { result } = renderHook(() => useCascadePickerController())

    act(() => result.current.selectProperty(property()))

    expect(result.current.propertyId).toBe("prop-1")
    expect(result.current.propertyLabel).toBe("Maple Court")
    expect(result.current.entityId).toBe("entity-1")
    expect(result.current.entityLabel).toBe("Acme Property Mgmt")
  })

  it("leaves the entity empty when the property has no linked entity", () => {
    const { result } = renderHook(() => useCascadePickerController())

    act(() =>
      result.current.selectProperty(
        property({ entityId: null, entityName: null }),
      ),
    )

    expect(result.current.propertyId).toBe("prop-1")
    expect(result.current.entityId).toBeNull()
    expect(result.current.entityLabel).toBeNull()
  })

  it("preserves an existing entity when the picked property shares it", () => {
    const { result } = renderHook(() => useCascadePickerController())

    act(() => result.current.selectEntity(entityOption()))
    act(() => result.current.selectProperty(property()))

    expect(result.current.entityId).toBe("entity-1")
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

  it("clears property and template when the entity changes", () => {
    const { result } = renderHook(() => useCascadePickerController())

    act(() => result.current.selectProperty(property()))
    act(() => result.current.selectTemplate(template()))

    act(() => result.current.selectEntity(entityOption({ id: "entity-2", entity: "Other Entity" })))

    expect(result.current.entityId).toBe("entity-2")
    expect(result.current.propertyId).toBeNull()
    expect(result.current.propertyLabel).toBeNull()
    expect(result.current.templateId).toBeNull()
  })

  it("seed sets selections directly without cascade side-effects", () => {
    const { result } = renderHook(() => useCascadePickerController())

    act(() =>
      result.current.seed({
        entity: { id: "entity-9", label: "Seeded Entity" },
        property: { id: "prop-9", label: "Seeded Property" },
        template: { id: "tmpl-9", label: "3BR" },
      }),
    )

    expect(result.current.entityId).toBe("entity-9")
    expect(result.current.entityLabel).toBe("Seeded Entity")
    expect(result.current.propertyId).toBe("prop-9")
    expect(result.current.propertyLabel).toBe("Seeded Property")
    expect(result.current.templateId).toBe("tmpl-9")
    expect(result.current.templateLabel).toBe("3BR")
  })

  it("seed leaves omitted steps untouched", () => {
    const { result } = renderHook(() => useCascadePickerController())

    act(() => result.current.seed({ property: { id: "prop-1", label: "Maple Court" } }))
    expect(result.current.propertyId).toBe("prop-1")
    expect(result.current.templateId).toBeNull()

    act(() => result.current.seed({ template: { id: "tmpl-1", label: "2BR" } }))
    // property untouched, template now set — no downstream clear
    expect(result.current.propertyId).toBe("prop-1")
    expect(result.current.templateId).toBe("tmpl-1")
  })

  it("reset clears every selection", () => {
    const { result } = renderHook(() => useCascadePickerController())

    act(() => result.current.selectProperty(property()))
    act(() => result.current.selectTemplate(template()))
    expect(result.current.hasSelections).toBe(true)

    act(() => result.current.reset())

    expect(result.current.hasSelections).toBe(false)
    expect(result.current.entityId).toBeNull()
    expect(result.current.propertyId).toBeNull()
    expect(result.current.templateId).toBeNull()
  })
})
