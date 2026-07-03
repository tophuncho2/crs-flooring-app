import { describe, expect, it } from "vitest"

import { applyUnitSeed } from "@/engines/record-view"

// A WO/templates-shaped row (sendUnit*) and an imports-shaped row (stockUnit*),
// each with an untouched sibling field to prove the helper only writes the trio.
type SendRow = {
  unitId: string
  sendUnitName: string
  sendUnitAbbrev: string
  quantity: string
}
type StockRow = {
  unitId: string
  stockUnitName: string
  stockUnitAbbrev: string
  note: string
}

describe("applyUnitSeed", () => {
  it("seeds the unit trio under the given keys (sendUnit*)", () => {
    const row: SendRow = { unitId: "", sendUnitName: "", sendUnitAbbrev: "", quantity: "5" }
    const result = applyUnitSeed(
      row,
      { unitId: "u1", unitName: "Square Feet", unitAbbrev: "SF" },
      { nameKey: "sendUnitName", abbrevKey: "sendUnitAbbrev" },
    )
    expect(result).toEqual({
      unitId: "u1",
      sendUnitName: "Square Feet",
      sendUnitAbbrev: "SF",
      quantity: "5", // untouched
    })
  })

  it("clears the trio to empty strings when the option is null", () => {
    const row: SendRow = {
      unitId: "u1",
      sendUnitName: "Square Feet",
      sendUnitAbbrev: "SF",
      quantity: "5",
    }
    const result = applyUnitSeed(row, null, {
      nameKey: "sendUnitName",
      abbrevKey: "sendUnitAbbrev",
    })
    expect(result).toEqual({
      unitId: "",
      sendUnitName: "",
      sendUnitAbbrev: "",
      quantity: "5", // non-target field left intact
    })
  })

  it("works for the imports stockUnit* key set too", () => {
    const row: StockRow = { unitId: "old", stockUnitName: "x", stockUnitAbbrev: "y", note: "keep" }
    const seeded = applyUnitSeed(
      row,
      { unitId: "u2", unitName: "Linear Feet", unitAbbrev: "LF" },
      { nameKey: "stockUnitName", abbrevKey: "stockUnitAbbrev" },
    )
    expect(seeded).toEqual({
      unitId: "u2",
      stockUnitName: "Linear Feet",
      stockUnitAbbrev: "LF",
      note: "keep",
    })

    const cleared = applyUnitSeed(seeded, null, {
      nameKey: "stockUnitName",
      abbrevKey: "stockUnitAbbrev",
    })
    expect(cleared).toEqual({ unitId: "", stockUnitName: "", stockUnitAbbrev: "", note: "keep" })
  })
})
