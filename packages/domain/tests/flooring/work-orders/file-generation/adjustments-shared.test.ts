import { describe, expect, it } from "vitest"
import { buildWorkOrderPickingTicketHtml } from "../../../../src/flooring/work-orders/file-generation/build-work-order-picking-ticket-html.js"
import { buildWorkOrderSlipHtml } from "../../../../src/flooring/work-orders/file-generation/build-work-order-slip-html.js"
import { renderWorkOrderAdjustments } from "../../../../src/flooring/work-orders/file-generation/work-order-document-sections.js"
import { EMPTY_CELL, makeAdjustment, makeFileGenInput, makeMaterialItem } from "./_fixtures.js"

type Items = ReturnType<typeof makeMaterialItem>[]

const picking = (items: Items) => renderWorkOrderAdjustments(items)
const slip = (items: Items) => renderWorkOrderAdjustments(items, { includeInventoryDetail: false })

// A single material item whose adjustments carry the given (quantity, unit)
// pairs and no coverage — used to observe sum formatting through the slip's
// collapsed Quantity cell in isolation.
function slipQtyOnly(quantities: string[], stockUnitAbbrev = ""): string {
  return slip([
    makeMaterialItem({
      inventoryAdjustments: quantities.map((quantity, i) =>
        makeAdjustment({ id: `a${i}`, quantity, coverage: "", stockUnitAbbrev }),
      ),
    }),
  ])
}

describe("both sections — empty adjustments are omitted entirely", () => {
  it("returns '' for an empty item list in both modes", () => {
    expect(picking([])).toBe("")
    expect(slip([])).toBe("")
  })

  it("returns '' when no item has any adjustments, in both modes", () => {
    const items = [makeMaterialItem({ inventoryAdjustments: [] })]
    expect(picking(items)).toBe("")
    expect(slip(items)).toBe("")
  })

  it("neither builder renders a flat-rows table when there are no adjustments", () => {
    const input = makeFileGenInput({ materialItems: [makeMaterialItem({ inventoryAdjustments: [] })] })
    expect(buildWorkOrderPickingTicketHtml(input)).not.toContain('<table class="flat-rows">')
    expect(buildWorkOrderSlipHtml(input)).not.toContain('<table class="flat-rows">')
  })
})

describe("both sections — items without adjustments are filtered out", () => {
  const items = [
    makeMaterialItem({ id: "empty", productName: "No Adjustments", inventoryAdjustments: [] }),
    makeMaterialItem({ id: "has", productName: "Has Adjustments", inventoryAdjustments: [makeAdjustment()] }),
  ]

  it("drops the empty item but keeps its sibling — picking ticket", () => {
    const html = picking(items)
    expect(html).toContain("<td>Has Adjustments</td>")
    expect(html).not.toContain("No Adjustments")
  })

  it("drops the empty item but keeps its sibling — slip", () => {
    const html = slip(items)
    expect(html).toContain("<td>Has Adjustments</td>")
    expect(html).not.toContain("No Adjustments")
  })
})

describe("both sections — summed totals are identical (shared sumItemTotals)", () => {
  it("the slip's collapsed total equals the picking ticket's subtotal", () => {
    const item = makeMaterialItem({
      inventoryAdjustments: [
        makeAdjustment({ id: "a1", quantity: "10", coverage: "120", stockUnitAbbrev: "rolls", itemCoverageUnitAbbrev: "sf" }),
        makeAdjustment({ id: "a2", quantity: "5", coverage: "60", stockUnitAbbrev: "rolls", itemCoverageUnitAbbrev: "sf" }),
      ],
    })

    // Picking ticket: under a subtotal-cell rule.
    expect(picking([item])).toContain('<td class="cl-num subtotal-cell">15 rolls</td>')
    expect(picking([item])).toContain('<td class="cl-num subtotal-cell">180 sf</td>')
    // Slip: the same numbers in the plain collapsed row.
    expect(slip([item])).toContain('<td class="cl-num">15 rolls</td>')
    expect(slip([item])).toContain('<td class="cl-num">180 sf</td>')
  })

  it("picks the unit abbrev from the first adjustment that carries one", () => {
    const item = makeMaterialItem({
      inventoryAdjustments: [
        makeAdjustment({ id: "a1", quantity: "1", coverage: "", stockUnitAbbrev: "" }),
        makeAdjustment({ id: "a2", quantity: "2", coverage: "", stockUnitAbbrev: "boxes" }),
      ],
    })
    expect(slip([item])).toContain('<td class="cl-num">3 boxes</td>')
  })
})

describe("both sections — sumDecimalStrings formatting (via rendered totals)", () => {
  it("trims trailing zeros and dot: 10.00 → 10", () => {
    expect(slipQtyOnly(["10.00"])).toContain('<td class="cl-num">10</td>')
  })

  it("trims to a single decimal: 10.50 → 10.5", () => {
    expect(slipQtyOnly(["10.50"])).toContain('<td class="cl-num">10.5</td>')
  })

  it("keeps significant decimals: 0.25 stays 0.25", () => {
    expect(slipQtyOnly(["0.25"])).toContain('<td class="cl-num">0.25</td>')
  })

  it("skips empty values when summing", () => {
    expect(slipQtyOnly(["10", "", ""])).toContain('<td class="cl-num">10</td>')
  })

  it("rounds the summed total to two decimals: 0.1 + 0.2 → 0.3", () => {
    expect(slipQtyOnly(["0.1", "0.2"])).toContain('<td class="cl-num">0.3</td>')
  })

  it("renders the empty-cell placeholder when nothing is summable", () => {
    expect(slipQtyOnly(["", ""])).toContain(`<td class="cl-num">${EMPTY_CELL}</td>`)
  })
})

describe("both sections — renderUnitValue", () => {
  it("renders the bare value when the unit abbrev is empty", () => {
    expect(slipQtyOnly(["42"], "")).toContain('<td class="cl-num">42</td>')
  })

  it("appends the unit abbrev when present", () => {
    expect(slipQtyOnly(["42"], "yd")).toContain('<td class="cl-num">42 yd</td>')
  })
})

describe("both sections — product name is HTML-escaped", () => {
  const productName = "<b>Carpet & Co</b>"
  const item = makeMaterialItem({ productName, inventoryAdjustments: [makeAdjustment()] })
  const escaped = "&lt;b&gt;Carpet &amp; Co&lt;/b&gt;"

  it("escapes the product name in the picking-ticket detail row", () => {
    const html = picking([item])
    expect(html).toContain(escaped)
    expect(html).not.toContain(productName)
  })

  it("escapes the product name in the slip collapsed row", () => {
    const html = slip([item])
    expect(html).toContain(escaped)
    expect(html).not.toContain(productName)
  })
})
