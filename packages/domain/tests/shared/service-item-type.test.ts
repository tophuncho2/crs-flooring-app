import { describe, expect, it } from "vitest"
import {
  DEFAULT_SERVICE_ITEM_TYPE,
  SERVICE_ITEM_TYPE_VALUES,
  isServiceItemType,
} from "../../src/shared/service-item-type.js"

describe("service-item-type value object", () => {
  it("exposes exactly the two members", () => {
    expect([...SERVICE_ITEM_TYPE_VALUES]).toEqual(["LABOR", "MISCELLANEOUS"])
  })

  it("defaults to LABOR", () => {
    expect(DEFAULT_SERVICE_ITEM_TYPE).toBe("LABOR")
  })

  it("guards membership", () => {
    expect(isServiceItemType("LABOR")).toBe(true)
    expect(isServiceItemType("MISCELLANEOUS")).toBe(true)
    expect(isServiceItemType("Labor")).toBe(false)
    expect(isServiceItemType("")).toBe(false)
    expect(isServiceItemType(null)).toBe(false)
    expect(isServiceItemType(42)).toBe(false)
  })
})
