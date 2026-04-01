import { describe, expect, it } from "vitest"
import {
  buildFlooringProductDisplayName,
  buildPadProductDisplayName,
  buildStoredFlooringProductName,
} from "@builders/domain"

describe("product display naming", () => {
  it("builds the stored product name from category, style, and color", () => {
    expect(
      buildStoredFlooringProductName({
        categoryName: "Carpet",
        style: "Plush",
        color: "Sand",
      }),
    ).toBe("Carpet - Plush - Sand")
  })

  it("prefers the persisted product name for display", () => {
    expect(
      buildFlooringProductDisplayName({
        name: "Carpet - Plush - Sand",
        categoryName: "Carpet",
        style: "Plush",
        color: "Sand",
      }),
    ).toBe("Carpet - Plush - Sand")
  })

  it("falls back to the canonical derived name when the persisted name is empty", () => {
    expect(
      buildFlooringProductDisplayName({
        name: "",
        categoryName: "Vinyl",
        style: "Tile",
        color: "Ash",
      }),
    ).toBe("Vinyl - Tile - Ash")
  })

  it("uses a pad-specific fallback label only when no name parts exist", () => {
    expect(
      buildPadProductDisplayName({
        name: "",
        categoryName: null,
        style: null,
        color: null,
      }),
    ).toBe("Pad Product")
  })
})
