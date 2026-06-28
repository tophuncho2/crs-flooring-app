import { describe, expect, it } from "vitest"
import { buildWorkOrderSlipHtml } from "../../../../src/flooring/work-orders/file-generation/build-work-order-slip-html.js"
import { renderWorkOrderAdjustments } from "../../../../src/flooring/work-orders/file-generation/work-order-document-sections.js"
import { makeAdjustment, makeFileGenInput, makeMaterialItem } from "./_fixtures.js"

// Slip = the customer-facing variant (Product / Quantity columns only) — every
// detail column toggled off.
function slipTable(items: ReturnType<typeof makeMaterialItem>[]): string {
  return renderWorkOrderAdjustments(items, {
    columns: { dyeLot: false, rollNumber: false, adjustment: false, location: false },
  })
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

describe("slip — one row per adjustment + a subtotal (mirrors the picking ticket)", () => {
  it("emits N detail rows + 1 subtotal row for an item with N adjustments", () => {
    const item = makeMaterialItem({
      productName: "Shaw Carpet",
      inventoryAdjustments: [
        makeAdjustment({ id: "a1", quantity: "10" }),
        makeAdjustment({ id: "a2", quantity: "5" }),
        makeAdjustment({ id: "a3", quantity: "2" }),
      ],
    })
    const html = slipTable([item])

    // <tr> count = 1 header + 3 detail + 1 subtotal = 5
    // (prefix needle: the subtotal row carries class="group-end")
    expect(count(html, "<tr")).toBe(5)
    expect(html).toContain("<td>Shaw Carpet</td>")
    // summed quantity (17) under a subtotal-cell rule
    expect(html).toContain('<td class="cl-num subtotal-cell">17 rolls</td>')
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

describe("slip — per-group subtotal row", () => {
  it("renders exactly one subtotal-cell per product group", () => {
    const html = slipTable([
      makeMaterialItem({
        inventoryAdjustments: [makeAdjustment({ id: "a1" }), makeAdjustment({ id: "a2" })],
      }),
    ])
    // Match the rendered cell, not the bare class (which also appears as a CSS rule).
    expect(count(html, '<td class="cl-num subtotal-cell">')).toBe(1)
  })
})

describe("slip — wired through the full builder", () => {
  it("buildWorkOrderSlipHtml lists each adjustment, subtotals, and omits detail", () => {
    const input = makeFileGenInput({
      materialItems: [
        makeMaterialItem({
          productName: "Vinyl Plank",
          inventoryAdjustments: [
            makeAdjustment({ id: "a1", quantity: "3", location: "LOC-LEAK" }),
            makeAdjustment({ id: "a2", quantity: "7", location: "LOC-LEAK" }),
          ],
        }),
      ],
    })
    const html = buildWorkOrderSlipHtml(input)
    expect(html).toContain("<td>Vinyl Plank</td>")
    // each adjustment on its own row, then the summed subtotal under a rule
    expect(html).toContain('<td class="cl-num">3 rolls</td>')
    expect(html).toContain('<td class="cl-num">7 rolls</td>')
    expect(html).toContain('<td class="cl-num subtotal-cell">10 rolls</td>')
    // warehouse-only detail still never leaks onto the slip
    expect(html).not.toContain("LOC-LEAK")
  })
})
