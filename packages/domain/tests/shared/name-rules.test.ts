import { describe, expect, it } from "vitest"
import { isBlankName } from "../../src/shared/name-rules.js"

describe("isBlankName", () => {
  it("treats undefined as blank", () => {
    expect(isBlankName(undefined)).toBe(true)
  })

  it("treats null as blank", () => {
    expect(isBlankName(null)).toBe(true)
  })

  it("treats the empty string as blank", () => {
    expect(isBlankName("")).toBe(true)
  })

  it("treats whitespace-only as blank", () => {
    expect(isBlankName("   ")).toBe(true)
    expect(isBlankName("\t\n ")).toBe(true)
  })

  it("treats a real value as not blank", () => {
    expect(isBlankName("Acme")).toBe(false)
  })

  it("treats a value with surrounding whitespace as not blank", () => {
    expect(isBlankName("  Acme  ")).toBe(false)
  })
})
