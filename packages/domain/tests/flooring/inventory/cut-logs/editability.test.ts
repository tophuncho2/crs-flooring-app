import { describe, expect, it } from "vitest"
import {
  canDeleteCutLog,
  canFinalizeCutLog,
  canRelinkCutLog,
  canVoidCutLog,
  getCutLogFinalizabilityBlocker,
  isCutLogPendingEditable,
} from "../../../../src/flooring/inventory/cut-logs/editability.js"

// Minimal lifecycle row — the predicates only read status / isFinal / void / cut.
function row(overrides: Record<string, unknown> = {}) {
  return { status: "PENDING", isFinal: false, void: false, cut: "5", ...overrides } as never
}

describe("isCutLogPendingEditable", () => {
  it("is true only for a clean PENDING row", () => {
    expect(isCutLogPendingEditable(row())).toBe(true)
  })

  it("is false once finalized, voided, or queued", () => {
    expect(isCutLogPendingEditable(row({ isFinal: true, status: "FINAL" }))).toBe(false)
    expect(isCutLogPendingEditable(row({ void: true, status: "VOID" }))).toBe(false)
    expect(isCutLogPendingEditable(row({ status: "QUEUED" }))).toBe(false)
  })
})

describe("canDeleteCutLog", () => {
  it("mirrors pending-editability", () => {
    expect(canDeleteCutLog(row())).toBe(true)
    expect(canDeleteCutLog(row({ isFinal: true, status: "FINAL" }))).toBe(false)
  })
})

describe("canVoidCutLog", () => {
  it("allows pending or finalized rows", () => {
    expect(canVoidCutLog(row())).toBe(true)
    expect(canVoidCutLog(row({ isFinal: true, status: "FINAL" }))).toBe(true)
  })

  it("rejects queued or already-voided rows", () => {
    expect(canVoidCutLog(row({ status: "QUEUED" }))).toBe(false)
    expect(canVoidCutLog(row({ void: true, status: "VOID" }))).toBe(false)
  })
})

describe("canRelinkCutLog", () => {
  it("allows pending and finalized rows but not voided or queued", () => {
    expect(canRelinkCutLog(row())).toBe(true)
    expect(canRelinkCutLog(row({ isFinal: true, status: "FINAL" }))).toBe(true)
    expect(canRelinkCutLog(row({ void: true, status: "VOID" }))).toBe(false)
    expect(canRelinkCutLog(row({ status: "QUEUED" }))).toBe(false)
  })
})

describe("getCutLogFinalizabilityBlocker", () => {
  it("returns null for a finalizable PENDING row with a positive cut", () => {
    expect(getCutLogFinalizabilityBlocker(row())).toBeNull()
    expect(canFinalizeCutLog(row())).toBe(true)
  })

  it("ranks QUEUED above every other blocker", () => {
    expect(
      getCutLogFinalizabilityBlocker(
        row({ status: "QUEUED", isFinal: true, void: true, cut: "0" }),
      ),
    ).toBe("ALREADY_QUEUED")
  })

  it("ranks void above final", () => {
    expect(getCutLogFinalizabilityBlocker(row({ void: true, isFinal: true }))).toBe("ALREADY_VOID")
  })

  it("flags an already-finalized row", () => {
    expect(getCutLogFinalizabilityBlocker(row({ isFinal: true, status: "FINAL" }))).toBe(
      "ALREADY_FINAL",
    )
  })

  it("flags a zero or negative cut on an otherwise ready row", () => {
    expect(getCutLogFinalizabilityBlocker(row({ cut: "0" }))).toBe("ZERO_OR_NEGATIVE_CUT")
    expect(getCutLogFinalizabilityBlocker(row({ cut: "-2" }))).toBe("ZERO_OR_NEGATIVE_CUT")
    expect(canFinalizeCutLog(row({ cut: "0" }))).toBe(false)
  })
})
