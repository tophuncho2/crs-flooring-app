import { describe, expect, it } from "vitest"
import {
  formatPhoneNumber,
  isValidPhoneNumber,
  normalizePhoneNumber,
} from "../../src/shared/phone.js"

describe("normalizePhoneNumber", () => {
  it("strips formatting to bare 10 digits", () => {
    expect(normalizePhoneNumber("(555) 123-4567")).toBe("5551234567")
    expect(normalizePhoneNumber("555.123.4567")).toBe("5551234567")
    expect(normalizePhoneNumber("555 123 4567")).toBe("5551234567")
    expect(normalizePhoneNumber("5551234567")).toBe("5551234567")
  })

  it("drops a leading country 1 on 11-digit input", () => {
    expect(normalizePhoneNumber("1-555-123-4567")).toBe("5551234567")
    expect(normalizePhoneNumber("+1 (555) 123-4567")).toBe("5551234567")
    expect(normalizePhoneNumber("15551234567")).toBe("5551234567")
  })

  it("keeps non-conforming digits as-is (lenient)", () => {
    expect(normalizePhoneNumber("555-1234")).toBe("5551234") // partial
    expect(normalizePhoneNumber("5551234567x89")).toBe("555123456789") // extension
    expect(normalizePhoneNumber("011 44 20 7946 0958")).toBe("011442079460958") // international
  })

  it("treats empty / non-digit garbage as absent", () => {
    expect(normalizePhoneNumber("")).toBe("")
    expect(normalizePhoneNumber("   ")).toBe("")
    expect(normalizePhoneNumber("abc")).toBe("")
  })
})

describe("isValidPhoneNumber", () => {
  it("is true only for a clean 10-digit number", () => {
    expect(isValidPhoneNumber("(555) 123-4567")).toBe(true)
    expect(isValidPhoneNumber("1-555-123-4567")).toBe(true)
    expect(isValidPhoneNumber("5551234567")).toBe(true)
  })

  it("is false for partial, over-length, or empty", () => {
    expect(isValidPhoneNumber("555-1234")).toBe(false)
    expect(isValidPhoneNumber("5551234567x89")).toBe(false)
    expect(isValidPhoneNumber("")).toBe(false)
    expect(isValidPhoneNumber("abc")).toBe(false)
  })
})

describe("formatPhoneNumber", () => {
  it("renders a clean 10-digit number as (XXX) XXX-XXXX", () => {
    expect(formatPhoneNumber("5551234567")).toBe("(555) 123-4567")
    expect(formatPhoneNumber("(555) 123-4567")).toBe("(555) 123-4567")
    expect(formatPhoneNumber("1-555-123-4567")).toBe("(555) 123-4567")
  })

  it("falls back to bare digits for non-conforming values", () => {
    expect(formatPhoneNumber("555-1234")).toBe("5551234")
    expect(formatPhoneNumber("5551234567x89")).toBe("555123456789")
  })

  it("returns empty for absent values so callers render their own placeholder", () => {
    expect(formatPhoneNumber("")).toBe("")
    expect(formatPhoneNumber("abc")).toBe("")
  })
})
