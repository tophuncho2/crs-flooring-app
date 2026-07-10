import { describe, expect, it } from "vitest"
import { DEFAULT_LIST_ORDER, appendUniqueOrderBy } from "../../src/shared/order-by.js"

describe("appendUniqueOrderBy", () => {
  it("appends a distinct clause", () => {
    const values: Array<Record<string, unknown>> = [{ createdAt: "desc" }]
    appendUniqueOrderBy(values, { id: "desc" })
    expect(values).toEqual([{ createdAt: "desc" }, { id: "desc" }])
  })

  it("skips a structurally identical duplicate", () => {
    const values: Array<Record<string, unknown>> = [{ product: { name: "asc" } }]
    appendUniqueOrderBy(values, { product: { name: "asc" } })
    expect(values).toEqual([{ product: { name: "asc" } }])
  })

  it("ignores null / undefined next values", () => {
    const values: Array<Record<string, unknown>> = [{ id: "asc" }]
    appendUniqueOrderBy(values, null)
    appendUniqueOrderBy(values, undefined)
    expect(values).toEqual([{ id: "asc" }])
  })
})

describe("DEFAULT_LIST_ORDER", () => {
  it("is the uniform invisible base order: newest first with id as final tiebreak", () => {
    expect(DEFAULT_LIST_ORDER).toEqual([{ createdAt: "desc" }, { id: "desc" }])
  })
})
