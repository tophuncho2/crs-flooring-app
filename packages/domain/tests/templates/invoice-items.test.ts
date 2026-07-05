import { describe, expect, it } from "vitest"
import { normalizeTemplateInvoiceItem } from "../../src/templates/invoice-items/normalizers.js"
import { validateTemplateInvoiceItemForm } from "../../src/templates/invoice-items/rules.js"

describe("normalizeTemplateInvoiceItem", () => {
  const base = {
    id: "pay-1",
    // Prisma Decimal.toString() drops trailing zeros ("10.5"); the normalizer must
    // canonicalize to "10.50" (the round-trip dirty-diff trap guard).
    amount: { toString: () => "10.5" } as { toString(): string },
    direction: "REVENUE" as const,
    notes: "deposit",
    createdAt: "2026-07-03T00:00:00.000Z",
    updatedAt: "2026-07-03T00:00:00.000Z",
    createdBy: "creator@example.com",
    updatedBy: "editor@example.com",
  }

  it("canonicalizes the amount and carries direction + notes", () => {
    const row = normalizeTemplateInvoiceItem(base)
    expect(row.amount).toBe("10.50")
    expect(row.direction).toBe("REVENUE")
    expect(row.notes).toBe("deposit")
  })

  it("coalesces missing notes + actors", () => {
    const row = normalizeTemplateInvoiceItem({
      ...base,
      notes: null,
      createdBy: null,
      updatedBy: null,
    })
    expect(row.notes).toBe("")
    expect(row.createdBy).toBeNull()
    expect(row.updatedBy).toBeNull()
  })

  it("converts Date timestamps to ISO strings", () => {
    const row = normalizeTemplateInvoiceItem({
      ...base,
      createdAt: new Date("2026-07-04T00:00:00.000Z"),
      updatedAt: new Date("2026-07-04T00:00:00.000Z"),
    })
    expect(row.createdAt).toBe("2026-07-04T00:00:00.000Z")
    expect(row.updatedAt).toBe("2026-07-04T00:00:00.000Z")
  })
})

describe("validateTemplateInvoiceItemForm", () => {
  const form = { amount: "10.00", direction: "REVENUE" as const, notes: "" }

  it("requires an amount", () => {
    expect(validateTemplateInvoiceItemForm({ ...form, amount: "" })).toMatch(/required/)
  })

  it("rejects an invalid amount", () => {
    expect(validateTemplateInvoiceItemForm({ ...form, amount: "1.234" })).toMatch(/valid amount/)
    expect(validateTemplateInvoiceItemForm({ ...form, amount: "abc" })).toMatch(/valid amount/)
  })

  it("rejects a zero amount as not positive", () => {
    expect(validateTemplateInvoiceItemForm({ ...form, amount: "0" })).toMatch(/greater than zero/)
  })

  it("rejects a negative amount as an invalid money value (fails validity first)", () => {
    expect(validateTemplateInvoiceItemForm({ ...form, amount: "-5" })).toMatch(/valid amount/)
  })

  it("rejects an unknown direction", () => {
    expect(
      validateTemplateInvoiceItemForm({ ...form, direction: "OTHER" as never }),
    ).toMatch(/Direction/)
  })

  it("accepts a positive amount with either direction", () => {
    expect(validateTemplateInvoiceItemForm(form)).toBe("")
    expect(validateTemplateInvoiceItemForm({ ...form, direction: "EXPENSE" })).toBe("")
  })
})
