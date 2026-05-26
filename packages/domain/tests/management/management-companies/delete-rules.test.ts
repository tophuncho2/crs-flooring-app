import { describe, expect, it } from "vitest"
import {
  getManagementCompanyDeleteBlockedMessage,
  isManagementCompanyDeleteBlocked,
} from "../../../src/management/management-companies/delete-rules.js"

describe("isManagementCompanyDeleteBlocked", () => {
  it("is not blocked with zero properties", () => {
    expect(isManagementCompanyDeleteBlocked({ propertyCount: 0 })).toBe(false)
  })

  it("is blocked with one or more properties", () => {
    expect(isManagementCompanyDeleteBlocked({ propertyCount: 1 })).toBe(true)
    expect(isManagementCompanyDeleteBlocked({ propertyCount: 9 })).toBe(true)
  })
})

describe("getManagementCompanyDeleteBlockedMessage", () => {
  it("returns an empty string when not blocked", () => {
    expect(getManagementCompanyDeleteBlockedMessage({ propertyCount: 0 })).toBe("")
  })

  it("returns the blocked message when properties are linked", () => {
    expect(getManagementCompanyDeleteBlockedMessage({ propertyCount: 2 })).toBe(
      "This management company has properties linked and cannot be deleted",
    )
  })
})
