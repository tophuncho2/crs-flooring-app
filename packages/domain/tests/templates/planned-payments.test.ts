import { describe, expect, it } from "vitest"
import { normalizeTemplatePlannedPayment } from "../../src/templates/planned-payments/normalizers.js"
import { validateTemplatePlannedPaymentForm } from "../../src/templates/planned-payments/rules.js"

describe("normalizeTemplatePlannedPayment", () => {
  const base = {
    id: "pay-1",
    // Prisma Decimal.toString() drops trailing zeros ("10.5"); the normalizer must
    // canonicalize to "10.50" (the round-trip dirty-diff trap guard).
    amount: { toString: () => "10.5" } as { toString(): string },
    direction: "REVENUE" as const,
    notes: "deposit",
    entityId: "ent-1",
    entity: {
      entity: "Acme Supply",
      entityTypes: [{ entityType: { id: "t1", type: "Vendor", color: "SLATE" as const } }],
    },
    paymentPurposeId: "pp-1",
    paymentPurpose: { name: "Deposit", color: "VIOLET" as const },
    createdAt: "2026-07-03T00:00:00.000Z",
    updatedAt: "2026-07-03T00:00:00.000Z",
    createdBy: "creator@example.com",
    updatedBy: "editor@example.com",
  }

  it("canonicalizes the amount and carries direction", () => {
    const row = normalizeTemplatePlannedPayment(base)
    expect(row.amount).toBe("10.50")
    expect(row.direction).toBe("REVENUE")
    expect(row.notes).toBe("deposit")
  })

  it("flattens the linked entity into name + type chips", () => {
    const row = normalizeTemplatePlannedPayment(base)
    expect(row.entityId).toBe("ent-1")
    expect(row.entityName).toBe("Acme Supply")
    expect(row.entityTypes).toEqual([{ id: "t1", type: "Vendor", color: "SLATE" }])
  })

  it("flattens the linked payment purpose into name + color", () => {
    const row = normalizeTemplatePlannedPayment(base)
    expect(row.paymentPurposeId).toBe("pp-1")
    expect(row.paymentPurposeName).toBe("Deposit")
    expect(row.paymentPurposeColor).toBe("VIOLET")
  })

  it("coalesces an unlinked entity to null name + empty types", () => {
    const row = normalizeTemplatePlannedPayment({ ...base, entityId: null, entity: null })
    expect(row.entityId).toBeNull()
    expect(row.entityName).toBeNull()
    expect(row.entityTypes).toEqual([])
  })

  it("coalesces an unlinked payment purpose to null name + color", () => {
    const row = normalizeTemplatePlannedPayment({
      ...base,
      paymentPurposeId: null,
      paymentPurpose: null,
    })
    expect(row.paymentPurposeId).toBeNull()
    expect(row.paymentPurposeName).toBeNull()
    expect(row.paymentPurposeColor).toBeNull()
  })

  it("coalesces missing actors + notes", () => {
    const row = normalizeTemplatePlannedPayment({
      ...base,
      notes: null,
      createdBy: null,
      updatedBy: null,
    })
    expect(row.notes).toBe("")
    expect(row.createdBy).toBeNull()
    expect(row.updatedBy).toBeNull()
  })
})

describe("validateTemplatePlannedPaymentForm", () => {
  const form = { amount: "10.00", direction: "REVENUE" as const }

  it("requires an amount", () => {
    expect(validateTemplatePlannedPaymentForm({ ...form, amount: "" })).toMatch(/required/)
  })

  it("rejects an invalid amount", () => {
    expect(validateTemplatePlannedPaymentForm({ ...form, amount: "1.234" })).toMatch(/valid amount/)
    expect(validateTemplatePlannedPaymentForm({ ...form, amount: "abc" })).toMatch(/valid amount/)
  })

  it("rejects a zero amount as not positive", () => {
    expect(validateTemplatePlannedPaymentForm({ ...form, amount: "0" })).toMatch(/greater than zero/)
  })

  it("rejects a negative amount as an invalid money value (fails validity first)", () => {
    // Negatives aren't valid money, so the validity check trips before the >0
    // check — matches validatePaymentForm's ordering.
    expect(validateTemplatePlannedPaymentForm({ ...form, amount: "-5" })).toMatch(/valid amount/)
  })

  it("rejects an unknown direction", () => {
    expect(
      validateTemplatePlannedPaymentForm({ ...form, direction: "OTHER" as never }),
    ).toMatch(/Direction/)
  })

  it("accepts a positive amount with either direction", () => {
    expect(validateTemplatePlannedPaymentForm(form)).toBe("")
    expect(validateTemplatePlannedPaymentForm({ ...form, direction: "EXPENSE" })).toBe("")
  })
})
