import { describe, expect, it } from "vitest"
import { buildWorkOrderSlipHtml } from "../../../../src/flooring/work-orders/file-generation/build-work-order-slip-html.js"
import { renderWorkOrderAdjustments } from "../../../../src/flooring/work-orders/file-generation/work-order-document-sections.js"
import { makeAdjustment, makeFileGenInput, makeMaterialItem } from "./_fixtures.js"

// Slip = the customer-facing, collapsed variant.
function slipTable(items: ReturnType<typeof makeMaterialItem>[]): string {
  return renderWorkOrderAdjustments(items, { includeInventoryDetail: false })
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

describe("slip — header is Product / Quantity only", () => {
  const html = slipTable([makeMaterialItem()])

  it("renders the two slip columns", () => {
    expect(html).toContain("<th>Product</th>")
    expect(html).toContain('<th class="cl-num">Quantity</th>')
  })

  it("omits the Coverage and warehouse-only column headers", () => {
    expect(html).not.toContain('<th class="cl-num">Coverage</th>')
    expect(html).not.toContain("<th>Dyelot</th>")
    expect(html).not.toContain("<th>Roll#</th>")
    expect(html).not.toContain('<th class="cl-num">Adjustment</th>')
    expect(html).not.toContain("<th>Location</th>")
  })
})

describe("slip — collapsed to one row per material item", () => {
  it("emits a single row for an item with many adjustments", () => {
    const item = makeMaterialItem({
      productName: "Shaw Carpet",
      inventoryAdjustments: [
        makeAdjustment({ id: "a1", quantity: "10", coverage: "120" }),
        makeAdjustment({ id: "a2", quantity: "5", coverage: "60" }),
        makeAdjustment({ id: "a3", quantity: "2", coverage: "24" }),
      ],
    })
    const html = slipTable([item])

    // <tr> count = 1 header + 1 collapsed item row
    expect(count(html, "<tr>")).toBe(2)
    expect(html).toContain("<td>Shaw Carpet</td>")
    // summed quantity (17), no per-adjustment breakdown
    expect(html).toContain('<td class="cl-num">17 rolls</td>')
  })
})

describe("slip — no warehouse detail leaks into the output", () => {
  const item = makeMaterialItem({
    inventoryAdjustments: [
      makeAdjustment({
        dyeLot: "DL-LEAK",
        rollNumber: "ROLL-LEAK",
        location: "LOC-LEAK",
        before: "100",
        after: "90",
      }),
    ],
  })
  const html = slipTable([item])

  it("omits dyelot / roll# / location values", () => {
    expect(html).not.toContain("DL-LEAK")
    expect(html).not.toContain("ROLL-LEAK")
    expect(html).not.toContain("LOC-LEAK")
  })

  it("omits the before → after transition", () => {
    expect(html).not.toContain("→")
  })
})

describe("slip — no subtotal rows", () => {
  it("never renders a subtotal-cell row", () => {
    const html = slipTable([
      makeMaterialItem({
        inventoryAdjustments: [makeAdjustment({ id: "a1" }), makeAdjustment({ id: "a2" })],
      }),
    ])
    // Match the rendered cell, not the bare class (which also appears as a CSS rule).
    expect(html).not.toContain('<td class="cl-num subtotal-cell">')
  })
})

describe("slip — wired through the full builder", () => {
  it("buildWorkOrderSlipHtml collapses and omits detail", () => {
    const input = makeFileGenInput({
      materialItems: [
        makeMaterialItem({
          productName: "Vinyl Plank",
          inventoryAdjustments: [
            makeAdjustment({ quantity: "3", coverage: "30", location: "LOC-LEAK" }),
            makeAdjustment({ quantity: "7", coverage: "70", location: "LOC-LEAK" }),
          ],
        }),
      ],
    })
    const html = buildWorkOrderSlipHtml(input)
    expect(html).toContain("<td>Vinyl Plank</td>")
    expect(html).toContain('<td class="cl-num">10 rolls</td>')
    expect(html).not.toContain("LOC-LEAK")
    expect(html).not.toContain('<td class="cl-num subtotal-cell">')
  })
})
