import { describe, expect, it } from "vitest"
import { validateJobTypeForm } from "../../../src/management/job-types/form-rules.js"
import { EMPTY_JOB_TYPE_FORM, toJobTypeForm } from "../../../src/management/job-types/types.js"

describe("validateJobTypeForm", () => {
  it("returns no error for a non-empty name", () => {
    expect(validateJobTypeForm({ name: "Install" })).toBe("")
  })

  it("flags an empty name", () => {
    expect(validateJobTypeForm({ name: "" })).toBe("Job type name is required")
  })

  it("flags a whitespace-only name", () => {
    expect(validateJobTypeForm({ name: "   " })).toBe("Job type name is required")
  })
})

describe("toJobTypeForm", () => {
  it("extracts just the name from a job type", () => {
    expect(
      toJobTypeForm({
        id: "jt-1",
        name: "Install",
        createdAt: "2026-05-26T00:00:00.000Z",
        updatedAt: "2026-05-26T00:00:00.000Z",
      }),
    ).toEqual({ name: "Install" })
  })
})

describe("EMPTY_JOB_TYPE_FORM", () => {
  it("has a blank name", () => {
    expect(EMPTY_JOB_TYPE_FORM).toEqual({ name: "" })
  })
})
