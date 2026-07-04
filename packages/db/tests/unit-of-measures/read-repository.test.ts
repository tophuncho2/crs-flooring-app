import { describe, expect, it, vi } from "vitest"
import { searchUnitOfMeasureOptions } from "../../src/unit-of-measures/read-repository.js"

function makeClient(rows: Array<{ id: string; name: string; abbreviation: string }>) {
  return { flooringUnitOfMeasure: { findMany: vi.fn().mockResolvedValue(rows) } }
}

describe("searchUnitOfMeasureOptions", () => {
  it("maps rows to {id,name,abbreviation} and reports hasMore=false on a partial page", async () => {
    const client = makeClient([
      { id: "u1", name: "Square Feet", abbreviation: "sq ft" },
      { id: "u2", name: "Square Yard", abbreviation: "sq yd" },
    ])

    const result = await searchUnitOfMeasureOptions({ take: 20 }, client as never)

    expect(result.items).toEqual([
      { id: "u1", name: "Square Feet", abbreviation: "sq ft" },
      { id: "u2", name: "Square Yard", abbreviation: "sq yd" },
    ])
    expect(result.hasMore).toBe(false)

    const arg = client.flooringUnitOfMeasure.findMany.mock.calls[0][0]
    // take+1 to detect the next page without a count query; name asc; skinny select.
    expect(arg.take).toBe(21)
    expect(arg.where).toBeUndefined()
    expect(arg.orderBy).toEqual({ name: "asc" })
    expect(arg.select).toEqual({ id: true, name: true, abbreviation: true })
  })

  it("detects a next page (take+1) and trims the extra row", async () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({
      id: `u${i}`,
      name: `Unit ${i}`,
      abbreviation: `u${i}`,
    }))
    const client = makeClient(rows)

    const result = await searchUnitOfMeasureOptions({ take: 2 }, client as never)

    expect(result.items).toHaveLength(2)
    expect(result.hasMore).toBe(true)
  })

  it("builds a case-insensitive contains filter and honours skip", async () => {
    const client = makeClient([])

    await searchUnitOfMeasureOptions({ search: "yard", skip: 5, take: 10 }, client as never)

    const arg = client.flooringUnitOfMeasure.findMany.mock.calls[0][0]
    expect(arg.where).toEqual({ name: { contains: "yard", mode: "insensitive" } })
    expect(arg.skip).toBe(5)
    expect(arg.take).toBe(11)
  })
})
