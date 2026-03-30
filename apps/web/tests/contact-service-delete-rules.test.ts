import { describe, expect, it } from "vitest"
import {
  getContactDeleteBlockedMessage,
  getServiceDeleteBlockedMessage,
  isContactDeleteBlocked,
  isServiceDeleteBlocked,
} from "@builders/domain"

describe("contact and service delete rules", () => {
  it("blocks contact deletion when linked to a work order", () => {
    const state = { templateAssignments: 0, workOrderAssignments: 1 }

    expect(isContactDeleteBlocked(state)).toBe(true)
    expect(getContactDeleteBlockedMessage(state)).toBe(
      "This contact is linked to work orders and cannot be deleted",
    )
  })

  it("blocks service deletion when linked to a work order", () => {
    const state = { templateItems: 0, workOrderItems: 2 }

    expect(isServiceDeleteBlocked(state)).toBe(true)
    expect(getServiceDeleteBlockedMessage(state)).toBe(
      "This service is linked to work orders and cannot be deleted",
    )
  })
})
