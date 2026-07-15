import { describe, expect, it } from "vitest"
import { buildWorkOrderPrintHtml } from "../../../src/work-orders/file-generation/build-work-order-print-html.js"
import { buildWorkOrderPrintConfig } from "../../../src/work-orders/file-generation/print-presets.js"
import { renderWorkOrderAdjustments } from "../../../src/work-orders/file-generation/work-order-document-sections.js"
import { EMPTY_CELL, makeAdjustment, makeFileGenInput, makeMaterialItem } from "./_fixtures.js"

// Picking ticket = the default (includeInventoryDetail omitted → true).
function pickingTable(items: ReturnType<typeof makeMaterialItem>[]): string {
  return renderWorkOrderAdjustments(items)
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

describe("picking ticket — header", () => {
  const html = pickingTable([makeMaterialItem()])

  it("renders all eight columns in order", () => {
    expect(html).toContain("<th>Adjustment Products</th>")
    expect(html).toContain("<th>Dyelot</th>")
    expect(html).toContain("<th>Roll#</th>")
    expect(html).toContain('<th class="cl-num">Quantity</th>')
    expect(html).toContain('<th class="cl-num">Converted</th>')
    expect(html).toContain('<th class="cl-num">Adjustment</th>')
    expect(html).toContain("<th>Location</th>")
    expect(html).toContain("<th>Area</th>")
  })

  it("omits the Coverage column header", () => {
    expect(html).not.toContain('<th class="cl-num">Coverage</th>')
  })
})

describe("picking ticket — one row per adjustment (not collapsed)", () => {
  it("emits N detail rows + 1 subtotal row for an item with N adjustments", () => {
    const item = makeMaterialItem({
      inventoryAdjustments: [
        makeAdjustment({ id: "a1", location: "WH-1" }),
        makeAdjustment({ id: "a2", location: "WH-2" }),
        makeAdjustment({ id: "a3", location: "WH-3" }),
      ],
    })
    const html = pickingTable([item])

    // <tr> count = 1 header + 3 detail + 1 subtotal = 5
    // (prefix needle: the subtotal row carries class="group-end")
    expect(count(html, "<tr")).toBe(5)
    // exactly one subtotal row (one subtotal cell — Quantity only)
    expect(count(html, '<td class="cl-num subtotal-cell">')).toBe(1)
  })
})

describe("picking ticket — detail columns from the adjustment's own snapshot", () => {
  const item = makeMaterialItem({
    inventoryAdjustments: [
      makeAdjustment({
        dyeLot: "DL-77",
        rollNumber: "R-2024",
        location: "AISLE-4",
        before: "100",
        after: "90",
        unitAbbrev: "rolls",
      }),
    ],
  })
  const html = pickingTable([item])

  it("renders the dyelot", () => {
    expect(html).toContain("<td>DL-77</td>")
  })

  it("renders the roll number", () => {
    expect(html).toContain("<td>R-2024</td>")
  })

  it("renders the location", () => {
    expect(html).toContain("<td>AISLE-4</td>")
  })
})

describe("picking ticket — location always shows (the invariant)", () => {
  it("renders a non-empty location verbatim", () => {
    const html = pickingTable([
      makeMaterialItem({ inventoryAdjustments: [makeAdjustment({ location: "DOCK-9" })] }),
    ])
    expect(html).toContain("<td>DOCK-9</td>")
  })

  it("renders the same location through the full picking-ticket builder", () => {
    const input = makeFileGenInput({
      materialItems: [makeMaterialItem({ inventoryAdjustments: [makeAdjustment({ location: "DOCK-9" })] })],
    })
    expect(buildWorkOrderPrintHtml(input, buildWorkOrderPrintConfig("pickingTicket"))).toContain(
      "<td>DOCK-9</td>",
    )
  })

  it("renders the empty-cell placeholder (cell still present) when location is blank", () => {
    const html = pickingTable([
      makeMaterialItem({ inventoryAdjustments: [makeAdjustment({ location: "" })] }),
    ])
    expect(html).toContain(`<td>${EMPTY_CELL}</td>`)
  })

  it("HTML-escapes a location containing markup", () => {
    const html = pickingTable([
      makeMaterialItem({ inventoryAdjustments: [makeAdjustment({ location: "<b>A&B</b>" })] }),
    ])
    expect(html).toContain("&lt;b&gt;A&amp;B&lt;/b&gt;")
    expect(html).not.toContain("<b>A&B</b>")
  })
})

describe("picking ticket — Converted (derived) column", () => {
  it("renders the converted balance with its target-unit suffix", () => {
    const html = pickingTable([
      makeMaterialItem({
        inventoryAdjustments: [
          makeAdjustment({ convertedBalance: "250", conversionUnitAbbrev: "SF" }),
        ],
      }),
    ])
    expect(html).toContain('<td class="cl-num">250 SF</td>')
  })

  it("renders the empty-cell placeholder when the adjustment has no linked formula", () => {
    const html = pickingTable([
      makeMaterialItem({
        inventoryAdjustments: [makeAdjustment({ convertedBalance: "", conversionUnitAbbrev: "" })],
      }),
    ])
    expect(html).toContain(`<td class="cl-num">${EMPTY_CELL}</td>`)
  })
})

describe("picking ticket — Adjustment (before → after) transition", () => {
  it("renders before → after with the unit suffix when both sides are present", () => {
    const html = pickingTable([
      makeMaterialItem({
        inventoryAdjustments: [makeAdjustment({ before: "100", after: "90", unitAbbrev: "rolls" })],
      }),
    ])
    expect(html).toContain("100 rolls → 90 rolls")
  })

  it("renders the placeholder when the before side is missing", () => {
    const html = pickingTable([
      makeMaterialItem({
        inventoryAdjustments: [makeAdjustment({ before: "", after: "90", unitAbbrev: "rolls" })],
      }),
    ])
    expect(html).not.toContain("→")
  })
})

describe("picking ticket — per-group subtotal row", () => {
  it("sums Quantity under a subtotal-cell rule", () => {
    const item = makeMaterialItem({
      inventoryAdjustments: [
        makeAdjustment({ quantity: "10", unitAbbrev: "rolls" }),
        makeAdjustment({ quantity: "5", unitAbbrev: "rolls" }),
      ],
    })
    const html = pickingTable([item])
    expect(html).toContain('<td class="cl-num subtotal-cell">15 rolls</td>')
  })
})

describe("picking ticket — grouping across material items (no grand total)", () => {
  it("each material item gets its own adjustment rows and its own subtotal", () => {
    const items = [
      makeMaterialItem({ id: "i1", productName: "Carpet A", inventoryAdjustments: [makeAdjustment({ id: "a" })] }),
      makeMaterialItem({ id: "i2", productName: "Carpet B", inventoryAdjustments: [makeAdjustment({ id: "b" })] }),
    ]
    const html = pickingTable(items)
    expect(html).toContain("<td>Carpet A</td>")
    expect(html).toContain("<td>Carpet B</td>")
    // two subtotal rows → two subtotal cells, and no third (grand-total) row
    expect(count(html, '<td class="cl-num subtotal-cell">')).toBe(2)
  })
})
