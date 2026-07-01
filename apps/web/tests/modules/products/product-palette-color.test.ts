import { describe, expect, it } from "vitest"
import { normalizeProductRow } from "@builders/db"
import { PALETTE_COLOR_INVALID_MESSAGE } from "@builders/domain"
import {
  validateCreateProductInput,
  validateUpdateProductInput,
} from "@/app/api/products/_validators"

// The non-semantic palette tag is a metadata-only visual column. These cover the
// three contract points the install must hold: the normalizer passes it through
// untouched (no recompute), the UPDATE validator strictly guards it when present,
// and the CREATE validator never accepts it (new rows fall to the DB default
// SLATE — edit-only scope).

const baseRowPayload = {
  id: "prod-1",
  productNumber: "PROD-1",
  name: "Carpet - Plush - Sand",
  categoryId: "cat-1",
  style: "Plush",
  color: "Sand",
  sendUnitName: "SY",
  sendUnitAbbrev: "SY",
  stockUnitName: "Roll",
  stockUnitAbbrev: "RL",
  coveragePerUnit: null,
  productNamingAddon: null,
  createdAt: new Date("2026-03-18T00:00:00Z"),
  updatedAt: new Date("2026-03-18T00:00:00Z"),
  createdBy: null,
  updatedBy: null,
  category: {
    id: "cat-1",
    slug: "carpet",
    name: "Carpet",
    sendUnitId: "u1",
    stockUnitId: "u2",
  },
}

describe("product paletteColor — normalizer passthrough", () => {
  it("passes the palette tag through untouched (no recompute)", () => {
    const normalized = normalizeProductRow({ ...baseRowPayload, paletteColor: "VIOLET" } as never)
    expect(normalized.paletteColor).toBe("VIOLET")
    // The tag never feeds the stored name — name is unchanged by the color.
    expect(normalized.name).toBe("Carpet - Plush - Sand")
  })
})

describe("product paletteColor — update validator (edit-only, strict-when-present)", () => {
  it("accepts a valid palette color", () => {
    const input = validateUpdateProductInput({ paletteColor: "TEAL" })
    expect(input.paletteColor).toBe("TEAL")
  })

  it("rejects an invalid palette color with PALETTE_COLOR_INVALID_MESSAGE", () => {
    expect(() => validateUpdateProductInput({ paletteColor: "NEON" })).toThrow(
      PALETTE_COLOR_INVALID_MESSAGE,
    )
  })

  it("leaves the color absent when not posted (stale client → unchanged)", () => {
    const input = validateUpdateProductInput({ style: "Plank" })
    expect("paletteColor" in input).toBe(false)
  })
})

describe("product paletteColor — create validator never accepts it (DB default SLATE)", () => {
  it("ignores a posted palette color on create", () => {
    const input = validateCreateProductInput({ categoryId: "cat-1", paletteColor: "ROSE" })
    expect("paletteColor" in input).toBe(false)
  })
})
