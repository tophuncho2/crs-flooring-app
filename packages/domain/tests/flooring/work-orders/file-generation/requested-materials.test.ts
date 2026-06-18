import { describe, expect, it } from "vitest"
import { buildWorkOrderRequestedMaterialsHtml } from "../../../../src/flooring/work-orders/file-generation/build-work-order-requested-materials-html.js"
import {
  renderWorkOrderMaterialItems,
  renderWorkOrderRequestedMaterialsHeader,
} from "../../../../src/flooring/work-orders/file-generation/work-order-document-sections.js"
import { makeFileGenInput, makeMaterialItemGroup, makeMaterialItemRow } from "./_fixtures.js"

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

describe("requested-materials — header tag", () => {
  it("carries the 'Requested Materials' tag (not the other view titles)", () => {
    const html = renderWorkOrderRequestedMaterialsHeader(makeFileGenInput(), null)
    expect(html).toContain('<span class="page-tag">Requested Materials</span>')
    expect(html).not.toContain("Picking Ticket")
    expect(html).not.toContain('page-tag">Work Order<')
  })
})

describe("requested-materials — table columns", () => {
  const html = renderWorkOrderMaterialItems([makeMaterialItemGroup()])

  it("renders the three Requested Materials columns", () => {
    expect(html).toContain("<th>Product</th>")
    expect(html).toContain('<th class="cl-num">Qty / Unit</th>')
    expect(html).toContain("<th>Notes</th>")
  })

  it("omits adjustment / warehouse-only columns", () => {
    expect(html).not.toContain("<th>Dyelot</th>")
    expect(html).not.toContain("<th>Roll#</th>")
    expect(html).not.toContain('<th class="cl-num">Adjustment</th>')
    expect(html).not.toContain("<th>Location</th>")
  })
})

describe("requested-materials — grouping + subtotal", () => {
  it("emits N item rows + 1 subtotal row for a group with N items", () => {
    const group = makeMaterialItemGroup({
      productName: "Shaw Carpet",
      materialItems: [
        makeMaterialItemRow({ id: "m1", quantity: "10", notes: "rush" }),
        makeMaterialItemRow({ id: "m2", quantity: "5" }),
        makeMaterialItemRow({ id: "m3", quantity: "2" }),
      ],
    })
    const html = renderWorkOrderMaterialItems([group])

    // <tr> count = 1 header + 3 item + 1 subtotal = 5
    expect(count(html, "<tr")).toBe(5)
    expect(html).toContain("<td>Shaw Carpet</td>")
    // qty + unit per row, notes rendered, summed quantity (17) under the rule
    expect(html).toContain('<td class="cl-num">10 SF</td>')
    expect(html).toContain('<td class="note-cell">rush</td>')
    expect(html).toContain('<td class="cl-num subtotal-cell">17 SF</td>')
  })

  it("renders exactly one subtotal-cell per product group", () => {
    const html = renderWorkOrderMaterialItems([
      makeMaterialItemGroup({ productName: "A", materialItems: [makeMaterialItemRow({ id: "a1" })] }),
      makeMaterialItemGroup({ productName: "B", materialItems: [makeMaterialItemRow({ id: "b1" })] }),
    ])
    expect(count(html, '<td class="cl-num subtotal-cell">')).toBe(2)
  })

  it("renders nothing when there are no material items", () => {
    expect(renderWorkOrderMaterialItems([])).toBe("")
    expect(renderWorkOrderMaterialItems([makeMaterialItemGroup({ materialItems: [] })])).toBe("")
  })
})

describe("requested-materials — wired through the full builder", () => {
  it("buildWorkOrderRequestedMaterialsHtml renders the header, info, and material items", () => {
    const input = makeFileGenInput({
      workOrderNumber: "WO-7777",
      materialItemGroups: [
        makeMaterialItemGroup({
          productName: "Vinyl Plank",
          materialItems: [
            makeMaterialItemRow({ id: "m1", quantity: "3" }),
            makeMaterialItemRow({ id: "m2", quantity: "7" }),
          ],
        }),
      ],
    })
    const html = buildWorkOrderRequestedMaterialsHtml(input)
    expect(html).toContain('<span class="page-tag">Requested Materials</span>')
    expect(html).toContain('<span class="page-number">WO-7777</span>')
    expect(html).toContain("<td>Vinyl Plank</td>")
    expect(html).toContain('<td class="cl-num subtotal-cell">10 SF</td>')
    // adjustments never surface on this view
    expect(html).not.toContain("<th>Dyelot</th>")
  })
})
