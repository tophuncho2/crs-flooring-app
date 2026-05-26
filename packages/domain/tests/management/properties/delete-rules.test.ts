import { describe, expect, it } from "vitest"
import {
  getPropertyDeleteBlockedMessage,
  isPropertyDeleteBlocked,
} from "../../../src/management/properties/delete-rules.js"

describe("isPropertyDeleteBlocked", () => {
  it("is not blocked with zero templates", () => {
    expect(isPropertyDeleteBlocked({ templateCount: 0 })).toBe(false)
  })

  it("is blocked with one or more templates", () => {
    expect(isPropertyDeleteBlocked({ templateCount: 1 })).toBe(true)
    expect(isPropertyDeleteBlocked({ templateCount: 12 })).toBe(true)
  })
})

describe("getPropertyDeleteBlockedMessage", () => {
  it("returns an empty string when not blocked", () => {
    expect(getPropertyDeleteBlockedMessage({ templateCount: 0 })).toBe("")
  })

  it("returns the blocked message when templates are linked", () => {
    expect(getPropertyDeleteBlockedMessage({ templateCount: 3 })).toBe(
      "This property has templates linked and cannot be deleted",
    )
  })
})
