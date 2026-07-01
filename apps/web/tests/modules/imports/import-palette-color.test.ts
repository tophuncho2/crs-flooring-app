import { describe, expect, it } from "vitest"
import { normalizeImportRow } from "@builders/db"
import { PALETTE_COLOR_INVALID_MESSAGE } from "@builders/domain"
import {
  validateCreateImportInput,
  validateUpdateImportInput,
} from "@/app/api/imports/_validators"

// The non-semantic palette tag is a metadata-only visual column on imports. These
// cover the three contract points the edit-only install must hold: the normalizer
// passes it through untouched (no recompute), the UPDATE validator strictly guards
// it when present, and the CREATE validator never accepts it (new rows fall to the
// DB default SLATE).

const baseRowPayload = {
  id: "import-1",
  importNumber: 1,
  purchaseOrderNumber: "PO-1",
  internalNotes: "",
  warehouseId: "wh-1",
  warehouse: { id: "wh-1", name: "Main" },
  color: "SLATE",
  _count: { stagedInventoryRows: 0, inventories: 0 },
  createdAt: new Date("2026-05-22T00:00:00Z"),
  updatedAt: new Date("2026-05-22T00:00:00Z"),
  createdBy: null,
  updatedBy: null,
}

describe("import color — normalizer passthrough", () => {
  it("passes the palette tag through untouched (no recompute)", () => {
    const normalized = normalizeImportRow({ ...baseRowPayload, color: "VIOLET" } as never)
    expect(normalized.color).toBe("VIOLET")
  })
})

describe("import color — update validator (edit-only, strict-when-present)", () => {
  it("accepts a valid palette color", () => {
    const input = validateUpdateImportInput({ color: "TEAL" })
    expect(input.color).toBe("TEAL")
  })

  it("rejects an invalid palette color with PALETTE_COLOR_INVALID_MESSAGE", () => {
    expect(() => validateUpdateImportInput({ color: "NEON" })).toThrow(
      PALETTE_COLOR_INVALID_MESSAGE,
    )
  })

  it("leaves the color absent when not posted (stale client → unchanged)", () => {
    const input = validateUpdateImportInput({ internalNotes: "note" })
    expect("color" in input).toBe(false)
  })
})

describe("import color — create validator never accepts it (DB default SLATE)", () => {
  it("ignores a posted palette color on create", () => {
    const input = validateCreateImportInput({ warehouseId: "wh-1", color: "ROSE" })
    expect("color" in input).toBe(false)
  })
})
