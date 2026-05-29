import { describe, expect, it } from "vitest"
import {
  composeInventoryItem,
  composeRollNumberDisplay,
  formatSignedAdjustmentCoverage,
} from "../../../src/flooring/inventory/formatters.js"

describe("formatSignedAdjustmentCoverage", () => {
  it("prefixes the adjustment sign onto the coverage + unit", () => {
    expect(formatSignedAdjustmentCoverage("118.85", "INCREASE", "sqft")).toBe("+118.85 sqft")
    expect(formatSignedAdjustmentCoverage("118.85", "DEDUCTION", "sqft")).toBe("−118.85 sqft")
  })

  it("returns null when coverage is absent or blank", () => {
    expect(formatSignedAdjustmentCoverage(null, "DEDUCTION", "sqft")).toBeNull()
    expect(formatSignedAdjustmentCoverage("  ", "DEDUCTION", "sqft")).toBeNull()
  })
})

describe("composeRollNumberDisplay", () => {
  it("prefixes a non-empty trimmed suffix", () => {
    expect(composeRollNumberDisplay("ROLL#", "R-1")).toBe("ROLL#R-1")
    expect(composeRollNumberDisplay("ROLL#", "  R-1  ")).toBe("ROLL#R-1")
  })

  it("returns an empty string when the suffix is blank", () => {
    expect(composeRollNumberDisplay("ROLL#", "")).toBe("")
    expect(composeRollNumberDisplay("ROLL#", "   ")).toBe("")
  })
})

describe("composeInventoryItem", () => {
  it("joins all non-empty parts in order with the ' · ' separator", () => {
    expect(
      composeInventoryItem({
        inventoryNumber: "INV-5",
        rollPrefix: "ROLL#",
        rollNumber: "R-1",
        dyeLot: "D-1",
        note: "back room",
      }),
    ).toBe("INV-5 · ROLL#R-1 · D-1 · back room")
  })

  it("skips empty parts (no placeholders)", () => {
    expect(
      composeInventoryItem({
        inventoryNumber: "INV-5",
        rollPrefix: "ROLL#",
        rollNumber: "",
        dyeLot: "D-1",
        note: "",
      }),
    ).toBe("INV-5 · D-1")
  })

  it("returns just the inventory number when every other part is empty", () => {
    expect(
      composeInventoryItem({
        inventoryNumber: "INV-5",
        rollPrefix: "ROLL#",
        rollNumber: "",
        dyeLot: "",
        note: "",
      }),
    ).toBe("INV-5")
  })
})
