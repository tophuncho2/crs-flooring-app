import { describe, expect, it } from "vitest"
import {
  normalizeJobType,
  normalizeJobTypeOption,
} from "../../../src/management/job-types/normalizers.js"

describe("normalizeJobType", () => {
  it("converts Date timestamps to ISO strings", () => {
    expect(
      normalizeJobType({
        id: "jt-1",
        name: "Install",
        createdAt: new Date("2026-05-26T01:02:03.000Z"),
        updatedAt: new Date("2026-05-27T04:05:06.000Z"),
      }),
    ).toEqual({
      id: "jt-1",
      name: "Install",
      createdAt: "2026-05-26T01:02:03.000Z",
      updatedAt: "2026-05-27T04:05:06.000Z",
    })
  })

  it("passes through string timestamps unchanged", () => {
    expect(
      normalizeJobType({
        id: "jt-2",
        name: "Repair",
        createdAt: "2026-05-26T00:00:00.000Z",
        updatedAt: "2026-05-26T00:00:00.000Z",
      }),
    ).toEqual({
      id: "jt-2",
      name: "Repair",
      createdAt: "2026-05-26T00:00:00.000Z",
      updatedAt: "2026-05-26T00:00:00.000Z",
    })
  })
})

describe("normalizeJobTypeOption", () => {
  it("keeps only id and name", () => {
    expect(
      normalizeJobTypeOption({ id: "jt-1", name: "Install", extra: "dropped" } as never),
    ).toEqual({ id: "jt-1", name: "Install" })
  })
})
