import { describe, expect, it } from "vitest"
import {
  assertBeforeCutAfterInvariant,
  assertCutLogDeleteAllowed,
  assertCutLogLinkageSymmetry,
  buildVoidedCutLogPatch,
} from "../../../../src/flooring/inventory/cut-logs/rules/cut-log-rules.js"
import {
  assertCutLogExpectedUpdatedAtMatches,
  assertCutLogLinkMutationAllowed,
  assertCutLogPendingMutationAllowed,
} from "../../../../src/flooring/inventory/cut-logs/rules/pending-mutation-rules.js"
import {
  buildCutLogVoidNotAllowedMessage,
  getCutLogVoidBlocker,
  isCutLogVoidable,
  validateCutLogVoidRequest,
} from "../../../../src/flooring/inventory/cut-logs/rules/void-rules.js"
import {
  describeCutLogPendingFormIssues,
  validateCutLogPendingForm,
} from "../../../../src/flooring/inventory/cut-logs/rules/form-rules.js"

function row(overrides: Record<string, unknown> = {}) {
  return { id: "cl-1", status: "PENDING", isFinal: false, void: false, ...overrides } as never
}

describe("assertBeforeCutAfterInvariant", () => {
  it("passes when before − cut === after (within tolerance)", () => {
    expect(() => assertBeforeCutAfterInvariant({ before: "10", cut: "3", after: "7" })).not.toThrow()
  })

  it("throws on an arithmetic mismatch", () => {
    expect(() => assertBeforeCutAfterInvariant({ before: "10", cut: "3", after: "5" })).toThrow(
      "CUT_LOG_ARITHMETIC_MISMATCH",
    )
  })

  it("throws on non-finite input", () => {
    expect(() => assertBeforeCutAfterInvariant({ before: "x", cut: "3", after: "7" })).toThrow(
      "CUT_LOG_ARITHMETIC_MISMATCH",
    )
  })
})

describe("assertCutLogLinkageSymmetry", () => {
  it("accepts both-null and both-set", () => {
    expect(() =>
      assertCutLogLinkageSymmetry({ workOrderId: null, workOrderItemId: null }),
    ).not.toThrow()
    expect(() =>
      assertCutLogLinkageSymmetry({ workOrderId: "wo", workOrderItemId: "womi" }),
    ).not.toThrow()
  })

  it("rejects a mixed pair", () => {
    expect(() =>
      assertCutLogLinkageSymmetry({ workOrderId: "wo", workOrderItemId: null }),
    ).toThrow("CUT_LOG_LINKAGE_ASYMMETRY")
  })
})

describe("assertCutLogDeleteAllowed", () => {
  it("allows a pending row, rejects a finalized one", () => {
    expect(() => assertCutLogDeleteAllowed(row())).not.toThrow()
    expect(() => assertCutLogDeleteAllowed(row({ isFinal: true, status: "FINAL" }))).toThrow(
      "CUT_LOG_PENDING_INPUT_NOT_ALLOWED",
    )
  })
})

describe("buildVoidedCutLogPatch", () => {
  it("returns the canonical clear patch", () => {
    expect(buildVoidedCutLogPatch()).toEqual({
      cut: "0",
      coverageCut: null,
      void: true,
      status: "VOID",
      workOrderId: null,
      workOrderItemId: null,
      location: null,
    })
  })
})

describe("assertCutLogPendingMutationAllowed", () => {
  it("allows pending, rejects finalized", () => {
    expect(() => assertCutLogPendingMutationAllowed(row())).not.toThrow()
    expect(() =>
      assertCutLogPendingMutationAllowed(row({ isFinal: true, status: "FINAL" })),
    ).toThrow("CUT_LOG_PENDING_INPUT_NOT_ALLOWED")
  })
})

describe("assertCutLogLinkMutationAllowed", () => {
  it("allows pending/final link edits, rejects voided or queued", () => {
    expect(() => assertCutLogLinkMutationAllowed(row())).not.toThrow()
    expect(() =>
      assertCutLogLinkMutationAllowed(row({ status: "FINAL" })),
    ).not.toThrow()
    expect(() => assertCutLogLinkMutationAllowed(row({ void: true }))).toThrow(
      "CUT_LOG_LINK_NOT_ALLOWED",
    )
    expect(() => assertCutLogLinkMutationAllowed(row({ status: "QUEUED" }))).toThrow(
      "CUT_LOG_LINK_NOT_ALLOWED",
    )
  })
})

describe("assertCutLogExpectedUpdatedAtMatches", () => {
  it("passes on an exact match and throws on a mismatch", () => {
    expect(() =>
      assertCutLogExpectedUpdatedAtMatches({ rowUpdatedAt: "t1", expected: "t1" }),
    ).not.toThrow()
    expect(() =>
      assertCutLogExpectedUpdatedAtMatches({ rowUpdatedAt: "t2", expected: "t1" }),
    ).toThrow("CUT_LOG_STALE_UPDATED_AT")
  })
})

describe("getCutLogVoidBlocker / isCutLogVoidable", () => {
  it("returns null for voidable pending and final rows", () => {
    expect(getCutLogVoidBlocker(row())).toBeNull()
    expect(getCutLogVoidBlocker(row({ isFinal: true, status: "FINAL" }))).toBeNull()
    expect(isCutLogVoidable(row())).toBe(true)
  })

  it("flags already-void, queued, and neither-pending-nor-final", () => {
    expect(getCutLogVoidBlocker(row({ void: true }))).toBe("ALREADY_VOID")
    expect(getCutLogVoidBlocker(row({ status: "QUEUED" }))).toBe("ALREADY_QUEUED")
    // not pending, not final, not queued, not void
    expect(getCutLogVoidBlocker(row({ status: "OTHER" }))).toBe("NOT_PENDING_OR_FINAL")
  })
})

describe("validateCutLogVoidRequest", () => {
  it("returns null on pass and an issue on fail", () => {
    expect(validateCutLogVoidRequest(row())).toBeNull()
    expect(validateCutLogVoidRequest(row({ id: "cl-9", void: true }))).toEqual({
      cutLogId: "cl-9",
      reason: "ALREADY_VOID",
    })
  })
})

describe("buildCutLogVoidNotAllowedMessage", () => {
  it("maps each reason to copy", () => {
    expect(buildCutLogVoidNotAllowedMessage("ALREADY_VOID")).toBe("Cut log is already voided.")
    expect(buildCutLogVoidNotAllowedMessage("ALREADY_QUEUED")).toBe(
      "Cut log has a worker job in flight; try again once it settles.",
    )
    expect(buildCutLogVoidNotAllowedMessage("NOT_PENDING_OR_FINAL")).toBe(
      "Only pending or finalized cut logs can be voided.",
    )
  })
})

describe("validateCutLogPendingForm", () => {
  it("passes a positive cut", () => {
    expect(validateCutLogPendingForm({ cut: "5", isWaste: false, notes: "" })).toEqual([])
  })

  it("flags a missing, non-numeric, or non-positive cut", () => {
    expect(validateCutLogPendingForm({ cut: "  ", isWaste: false, notes: "" })).toEqual([
      { code: "CUT_LOG_CUT_REQUIRED" },
    ])
    expect(validateCutLogPendingForm({ cut: "abc", isWaste: false, notes: "" })).toEqual([
      { code: "CUT_LOG_CUT_INVALID", value: "abc" },
    ])
    expect(validateCutLogPendingForm({ cut: "0", isWaste: false, notes: "" })).toEqual([
      { code: "CUT_LOG_CUT_NOT_POSITIVE", value: "0" },
    ])
  })
})

describe("describeCutLogPendingFormIssues", () => {
  it("joins issue messages", () => {
    expect(describeCutLogPendingFormIssues([{ code: "CUT_LOG_CUT_REQUIRED" }])).toBe(
      "Cut value is required.",
    )
  })
})
