import { describe, expect, it } from "vitest"
import {
  composeInventoryItem,
  composeRollNumberDisplay,
  parseInventoryDecimal,
  toInventoryFixedString,
} from "../../../src/flooring/inventory/formatters.js"

describe("parseInventoryDecimal", () => {
  it("parses a valid decimal string to a number", () => {
    expect(parseInventoryDecimal("100.5")).toBe(100.5)
    expect(parseInventoryDecimal("0")).toBe(0)
  })

  it("floors non-finite or non-numeric input to 0 (silent contract)", () => {
    expect(parseInventoryDecimal("")).toBe(0)
    expect(parseInventoryDecimal("abc")).toBe(0)
    expect(parseInventoryDecimal("Infinity")).toBe(0)
    expect(parseInventoryDecimal("NaN")).toBe(0)
  })
})

describe("toInventoryFixedString", () => {
  it("formats to a fixed two-decimal string", () => {
    expect(toInventoryFixedString(100)).toBe("100.00")
  })

  it("rounds at the .005 boundary as JS toFixed does", () => {
    // (1.005).toFixed(2) === "1.00" due to float representation — pin reality, not math.
    expect(toInventoryFixedString(1.005)).toBe("1.00")
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
