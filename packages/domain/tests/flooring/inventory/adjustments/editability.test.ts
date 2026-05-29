import { describe, expect, it } from "vitest"
import {
  canDeleteAdjustment,
  canFinalizeAdjustment,
  canRelinkAdjustment,
  getAdjustmentFinalizabilityBlocker,
  isAdjustmentPendingEditable,
} from "../../../../src/flooring/inventory/adjustments/editability.js"

function row(overrides: Record<string, unknown> = {}) {
  return {
    status: "PENDING",
    isFinal: false,
    quantity: "5",
    adjustmentType: "DEDUCTION",
    ...overrides,
  } as never
}

describe("isAdjustmentPendingEditable", () => {
  it("is true only for a clean PENDING row", () => {
    expect(isAdjustmentPendingEditable(row())).toBe(true)
  })

  it("is false once finalized or queued", () => {
    expect(isAdjustmentPendingEditable(row({ isFinal: true, status: "FINAL" }))).toBe(false)
    expect(isAdjustmentPendingEditable(row({ status: "QUEUED" }))).toBe(false)
  })
})

describe("canDeleteAdjustment", () => {
  it("mirrors pending-editability", () => {
    expect(canDeleteAdjustment(row())).toBe(true)
    expect(canDeleteAdjustment(row({ isFinal: true, status: "FINAL" }))).toBe(false)
  })
})

describe("canRelinkAdjustment", () => {
  it("allows pending and finalized rows of either direction, rejects only QUEUED", () => {
    expect(canRelinkAdjustment(row())).toBe(true)
    expect(canRelinkAdjustment(row({ isFinal: true, status: "FINAL" }))).toBe(true)
    expect(canRelinkAdjustment(row({ status: "QUEUED" }))).toBe(false)
    expect(canRelinkAdjustment(row({ adjustmentType: "INCREASE" }))).toBe(true)
    expect(
      canRelinkAdjustment(row({ adjustmentType: "INCREASE", isFinal: true, status: "FINAL" })),
    ).toBe(true)
    expect(
      canRelinkAdjustment(row({ adjustmentType: "INCREASE", status: "QUEUED" })),
    ).toBe(false)
  })
})

describe("getAdjustmentFinalizabilityBlocker", () => {
  it("returns null for a finalizable PENDING row with a positive quantity", () => {
    expect(getAdjustmentFinalizabilityBlocker(row())).toBeNull()
    expect(canFinalizeAdjustment(row())).toBe(true)
  })

  it("returns null for a finalizable INCREASE row (signed math is sign-agnostic at finalize)", () => {
    expect(
      getAdjustmentFinalizabilityBlocker(row({ adjustmentType: "INCREASE", quantity: "30" })),
    ).toBeNull()
  })

  it("ranks QUEUED above every other blocker", () => {
    expect(
      getAdjustmentFinalizabilityBlocker(
        row({ status: "QUEUED", isFinal: true, quantity: "0" }),
      ),
    ).toBe("ALREADY_QUEUED")
  })

  it("flags an already-finalized row", () => {
    expect(getAdjustmentFinalizabilityBlocker(row({ isFinal: true, status: "FINAL" }))).toBe(
      "ALREADY_FINAL",
    )
  })

  it("flags a zero or negative quantity on an otherwise ready row", () => {
    expect(getAdjustmentFinalizabilityBlocker(row({ quantity: "0" }))).toBe(
      "ZERO_OR_NEGATIVE_QUANTITY",
    )
    expect(getAdjustmentFinalizabilityBlocker(row({ quantity: "-2" }))).toBe(
      "ZERO_OR_NEGATIVE_QUANTITY",
    )
    expect(canFinalizeAdjustment(row({ quantity: "0" }))).toBe(false)
  })
})
