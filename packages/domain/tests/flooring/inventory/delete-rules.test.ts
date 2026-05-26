import { describe, expect, it } from "vitest"
import {
  buildInventoryDeleteBlockedMessage,
  isInventoryDeleteBlocked,
} from "../../../src/flooring/inventory/delete-rules.js"

describe("isInventoryDeleteBlocked", () => {
  it("is not blocked with zero cut logs", () => {
    expect(isInventoryDeleteBlocked({ cutLogsCount: 0 })).toBe(false)
  })

  it("is blocked with one or more cut logs", () => {
    expect(isInventoryDeleteBlocked({ cutLogsCount: 1 })).toBe(true)
    expect(isInventoryDeleteBlocked({ cutLogsCount: 9 })).toBe(true)
  })
})

describe("buildInventoryDeleteBlockedMessage", () => {
  it("reports the no-link case", () => {
    expect(buildInventoryDeleteBlockedMessage({ cutLogsCount: 0 })).toBe(
      "Inventory row has no linked cut logs",
    )
  })

  it("uses singular grammar for one cut log", () => {
    expect(buildInventoryDeleteBlockedMessage({ cutLogsCount: 1 })).toBe(
      "Inventory cannot be deleted while 1 cut log references it",
    )
  })

  it("uses plural grammar for many cut logs", () => {
    expect(buildInventoryDeleteBlockedMessage({ cutLogsCount: 3 })).toBe(
      "Inventory cannot be deleted while 3 cut logs reference it",
    )
  })
})
