import { describe, expect, it } from "vitest"

import { applyUnitSeed } from "@/engines/record-view"

// A WO/templates-shaped row and an imports-shaped row (both carry the unit label
// under `unitName`/`unitAbbrev`), each with an untouched sibling field to prove
// the helper only writes the trio.
type SendRow = {
  unitId: string
  unitName: string
  unitAbbrev: string
  quantity: string
}
type StockRow = {
  unitId: string
  unitName: string
  unitAbbrev: string
  note: string
}

describe("applyUnitSeed", () => {
  it("seeds the unit trio under the given keys (WO/templates row)", () => {
    const row: SendRow = { unitId: "", unitName: "", unitAbbrev: "", quantity: "5" }
    const result = applyUnitSeed(
      row,
      { unitId: "u1", unitName: "Square Feet", unitAbbrev: "SF" },
      { nameKey: "unitName", abbrevKey: "unitAbbrev" },
    )
    expect(result).toEqual({
      unitId: "u1",
      unitName: "Square Feet",
      unitAbbrev: "SF",
      quantity: "5", // untouched
    })
  })

  it("clears the trio to empty strings when the option is null", () => {
    const row: SendRow = {
      unitId: "u1",
      unitName: "Square Feet",
      unitAbbrev: "SF",
      quantity: "5",
    }
    const result = applyUnitSeed(row, null, {
      nameKey: "unitName",
      abbrevKey: "unitAbbrev",
    })
    expect(result).toEqual({
      unitId: "",
      unitName: "",
      unitAbbrev: "",
      quantity: "5", // non-target field left intact
    })
  })

  it("works for the imports-shaped row too", () => {
    const row: StockRow = { unitId: "old", unitName: "x", unitAbbrev: "y", note: "keep" }
    const seeded = applyUnitSeed(
      row,
      { unitId: "u2", unitName: "Linear Feet", unitAbbrev: "LF" },
      { nameKey: "unitName", abbrevKey: "unitAbbrev" },
    )
    expect(seeded).toEqual({
      unitId: "u2",
      unitName: "Linear Feet",
      unitAbbrev: "LF",
      note: "keep",
    })

    const cleared = applyUnitSeed(seeded, null, {
      nameKey: "unitName",
      abbrevKey: "unitAbbrev",
    })
    expect(cleared).toEqual({ unitId: "", unitName: "", unitAbbrev: "", note: "keep" })
  })
})
