import { describe, expect, it } from "vitest"
import {
  formatSignedPaymentAmount,
  signedPaymentAmount,
} from "../../../src/flooring/payments/signed-amount.js"

describe("formatSignedPaymentAmount", () => {
  it("prefixes + for INFLOW and − (U+2212) for OUTFLOW", () => {
    expect(formatSignedPaymentAmount("10.00", "INFLOW")).toBe("+$10.00")
    expect(formatSignedPaymentAmount("10.00", "OUTFLOW")).toBe("−$10.00")
  })

  it("normalizes the amount through the money standard", () => {
    expect(formatSignedPaymentAmount("10.5", "INFLOW")).toBe("+$10.50")
  })

  it("returns the placeholder '—' when the amount is absent", () => {
    expect(formatSignedPaymentAmount(null, "INFLOW")).toBe("—")
    expect(formatSignedPaymentAmount("", "OUTFLOW")).toBe("—")
  })
})

describe("signedPaymentAmount", () => {
  it("maps OUTFLOW to a negative number string and INFLOW to positive", () => {
    expect(signedPaymentAmount("10.00", "OUTFLOW")).toBe("-10.00")
    expect(signedPaymentAmount("10.00", "INFLOW")).toBe("10.00")
  })

  it("leaves zero and empty input unsigned", () => {
    expect(signedPaymentAmount("0.00", "OUTFLOW")).toBe("0.00")
    expect(signedPaymentAmount("", "OUTFLOW")).toBe("")
  })
})
