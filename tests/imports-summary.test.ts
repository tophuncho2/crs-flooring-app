import { describe, expect, it } from "vitest"
import { calculateImportItemTotal, calculateImportSummary } from "@/features/flooring/imports/summary"

describe("imports summary", () => {
  it("treats line total as cost plus freight without multiplying by stock count", () => {
    expect(
      calculateImportItemTotal({
        stockCount: "7",
        cost: "12.5",
        freight: "3.5",
      }),
    ).toBe(16)
  })

  it("sums all line cost and freight values into the header total", () => {
    expect(
      calculateImportSummary([
        {
          stockCount: "2",
          cost: "10",
          freight: "11",
        },
        {
          stockCount: "25",
          cost: "7.25",
          freight: "1.75",
        },
      ]),
    ).toMatchObject({
      materialItemsCount: 2,
      totalCost: 30,
      totalCostLabel: "$30.00",
    })
  })
})
