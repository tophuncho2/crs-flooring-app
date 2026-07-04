import { describe, expect, it } from "vitest"
import { validateWorkOrderForm } from "../../src/work-orders/form-rules.js"
import { EMPTY_WORK_ORDER_FORM } from "../../src/work-orders/types.js"

const baseForm = { ...EMPTY_WORK_ORDER_FORM, propertyId: "prop-1" }

describe("validateWorkOrderForm — vacancy", () => {
  it("accepts VACANT", () => {
    expect(validateWorkOrderForm({ ...baseForm, vacancy: "VACANT" })).toBe("")
  })

  it("accepts OCCUPIED", () => {
    expect(validateWorkOrderForm({ ...baseForm, vacancy: "OCCUPIED" })).toBe("")
  })

  it("accepts an empty vacancy (optional — nothing chosen)", () => {
    expect(validateWorkOrderForm({ ...baseForm, vacancy: "" })).toBe("")
  })

  it("accepts a work order with no property (auto WO# means a record is never empty)", () => {
    expect(validateWorkOrderForm({ ...EMPTY_WORK_ORDER_FORM, vacancy: "VACANT" })).toBe("")
  })
})

describe("validateWorkOrderForm — time of day (optional)", () => {
  const validBase = { ...baseForm, vacancy: "VACANT" as const }

  it("accepts a blank time of day", () => {
    expect(validateWorkOrderForm({ ...validBase, timeOfDay: "" })).toBe("")
  })

  it("accepts AM", () => {
    expect(validateWorkOrderForm({ ...validBase, timeOfDay: "AM" })).toBe("")
  })

  it("accepts PM", () => {
    expect(validateWorkOrderForm({ ...validBase, timeOfDay: "PM" })).toBe("")
  })
})
