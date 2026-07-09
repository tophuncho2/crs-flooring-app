import { describe, expect, it } from "vitest"
import { buildWorkOrdersWhere } from "../../src/work-orders/read-repository.js"

/**
 * Executable spec for the work-orders list where-builder. The ID/enum filters
 * are multi-value `IN` clauses (the list UI now exposes multi-select chips for
 * warehouse + job type); the free-text bars stay single-by-nature — the builder
 * consumes only `[0]` of those arrays.
 */
describe("buildWorkOrdersWhere", () => {
  it("emits a multi-value IN clause for each ID/enum filter", () => {
    expect(buildWorkOrdersWhere({ warehouseId: ["w1", "w2"] })).toEqual({
      warehouseId: { in: ["w1", "w2"] },
    })
    expect(buildWorkOrdersWhere({ jobTypeId: ["j1", "j2", "j3"] })).toEqual({
      jobTypeId: { in: ["j1", "j2", "j3"] },
    })
    expect(buildWorkOrdersWhere({ entityId: ["e1", "e2"] })).toEqual({
      property: { entityId: { in: ["e1", "e2"] } },
    })
    expect(buildWorkOrdersWhere({ state: ["CA", "TX"] })).toEqual({
      state: { in: ["CA", "TX"] },
    })
  })

  it("ANDs several multi-value filters into one where (union per key, intersect across keys)", () => {
    expect(
      buildWorkOrdersWhere({ warehouseId: ["w1", "w2"], jobTypeId: ["j1"] }),
    ).toEqual({
      AND: [{ warehouseId: { in: ["w1", "w2"] } }, { jobTypeId: { in: ["j1"] } }],
    })
  })

  it("keeps free-text bars single-by-nature — only the first value is used", () => {
    expect(buildWorkOrdersWhere({ unitType: ["A", "B"] })).toEqual({
      unitType: { contains: "A", mode: "insensitive" },
    })
  })

  it("returns undefined when no filters are set", () => {
    expect(buildWorkOrdersWhere(undefined)).toBeUndefined()
    expect(buildWorkOrdersWhere({ warehouseId: [] })).toBeUndefined()
  })
})
