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

  it("recomposes the stored name when the category changes (drives update-product)", () => {
    // The stored name embeds the category name, so `update-product` must rebuild
    // it on a category change (UoM epic 2A made categoryId mutable).
    const before = buildStoredFlooringProductName({
      categoryName: "Carpet",
      style: "Plush",
      color: "Sand",
    })
    const after = buildStoredFlooringProductName({
      categoryName: "Vinyl",
      style: "Plush",
      color: "Sand",
    })
    expect(before).toBe("Carpet - Plush - Sand")
    expect(after).toBe("Vinyl - Plush - Sand")
    expect(after).not.toBe(before)
  })

  it("appends the naming addon as the final segment of the stored name", () => {
    expect(
      buildStoredFlooringProductName({
        categoryName: "Carpet",
        style: "Plush",
        color: "Sand",
        productNamingAddon: "Roll 7",
      }),
    ).toBe("Carpet - Plush - Sand - Roll 7")
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
