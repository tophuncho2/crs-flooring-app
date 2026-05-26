import { describe, expect, it } from "vitest"
import {
  getJobTypeDeleteBlockedMessage,
  isJobTypeDeleteBlocked,
} from "../../../src/management/job-types/delete-rules.js"

describe("isJobTypeDeleteBlocked", () => {
  it("allows deletion when nothing is linked", () => {
    expect(isJobTypeDeleteBlocked({ workOrderCount: 0, templateCount: 0 })).toBe(false)
  })

  it("blocks when only work orders are linked", () => {
    expect(isJobTypeDeleteBlocked({ workOrderCount: 2, templateCount: 0 })).toBe(true)
  })

  it("blocks when only templates are linked", () => {
    expect(isJobTypeDeleteBlocked({ workOrderCount: 0, templateCount: 5 })).toBe(true)
  })
})

describe("getJobTypeDeleteBlockedMessage", () => {
  it("mentions both when work orders and templates are linked", () => {
    expect(getJobTypeDeleteBlockedMessage({ workOrderCount: 1, templateCount: 1 })).toBe(
      "This job type is linked to work orders and templates and cannot be deleted",
    )
  })

  it("mentions work orders only", () => {
    expect(getJobTypeDeleteBlockedMessage({ workOrderCount: 1, templateCount: 0 })).toBe(
      "This job type is linked to work orders and cannot be deleted",
    )
  })

  it("mentions templates only", () => {
    expect(getJobTypeDeleteBlockedMessage({ workOrderCount: 0, templateCount: 1 })).toBe(
      "This job type is linked to templates and cannot be deleted",
    )
  })

  it("returns an empty string when nothing is linked", () => {
    expect(getJobTypeDeleteBlockedMessage({ workOrderCount: 0, templateCount: 0 })).toBe("")
  })
})
