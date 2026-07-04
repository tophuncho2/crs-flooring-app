import { describe, expect, it } from "vitest"
import {
  formatSignedPaymentAmount,
  signedPaymentAmount,
} from "../../src/payments/signed-amount.js"

describe("formatSignedPaymentAmount", () => {
  it("prefixes + for REVENUE and − (U+2212) for EXPENSE", () => {
    expect(formatSignedPaymentAmount("10.00", "REVENUE")).toBe("+$10.00")
    expect(formatSignedPaymentAmount("10.00", "EXPENSE")).toBe("−$10.00")
  })

  it("normalizes the amount through the money standard", () => {
    expect(formatSignedPaymentAmount("10.5", "REVENUE")).toBe("+$10.50")
  })

  it("returns the placeholder '—' when the amount is absent", () => {
    expect(formatSignedPaymentAmount(null, "REVENUE")).toBe("—")
    expect(formatSignedPaymentAmount("", "EXPENSE")).toBe("—")
  })
})

describe("signedPaymentAmount", () => {
  it("maps EXPENSE to a negative number string and REVENUE to positive", () => {
    expect(signedPaymentAmount("10.00", "EXPENSE")).toBe("-10.00")
    expect(signedPaymentAmount("10.00", "REVENUE")).toBe("10.00")
  })

  it("leaves zero and empty input unsigned", () => {
    expect(signedPaymentAmount("0.00", "EXPENSE")).toBe("0.00")
    expect(signedPaymentAmount("", "EXPENSE")).toBe("")
  })
})
