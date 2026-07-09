import { describe, expect, it } from "vitest"
import {
  renderInventoryAdjustments,
  renderInventoryDocumentHeader,
  renderInventoryPrimaryBlock,
} from "../../../src/inventory/file-generation/inventory-document-sections.js"
import { buildInventoryPrintConfig } from "../../../src/inventory/file-generation/print-presets.js"
import { EMPTY_CELL, makeAdjustment, makeInventoryDetail } from "./_fixtures.js"

describe("renderInventoryDocumentHeader", () => {
  it("renders the brand text (no logo), the centered tag, and the inventory number", () => {
    const html = renderInventoryDocumentHeader({ inventoryNumber: "INV-1042" }, "Inventory Item", null)
    expect(html).toContain("CRS Floor Covering")
    expect(html).toContain('<span class="page-tag">Inventory Item</span>')
    expect(html).toContain('<span class="page-number">INV-1042</span>')
    expect(html).not.toContain("<img")
  })

  it("renders the logo img when a URL is supplied", () => {
    const html = renderInventoryDocumentHeader({ inventoryNumber: "INV-1" }, "Inventory Item", "https://x/logo.png")
    expect(html).toContain('<img class="page-logo" src="https://x/logo.png"')
  })
})

describe("renderInventoryPrimaryBlock — field gating", () => {
  const inventory = makeInventoryDetail()
  const columns = buildInventoryPrintConfig("inventoryItem").inventoryColumns

  it("renders a checked field's label + value", () => {
    const html = renderInventoryPrimaryBlock(inventory, { ...columns, productName: true })
    expect(html).toContain("<th>Product</th>")
    expect(html).toContain("Mohawk Berber - Oatmeal")
  })

  it("drops an unchecked field", () => {
    const html = renderInventoryPrimaryBlock(inventory, { ...columns, warehouseName: false })
    expect(html).not.toContain("<th>Warehouse</th>")
  })

  it("never renders Inv # in the block (it's the header id, not a togglable field)", () => {
    // Even if a stray inventoryNumber key is truthy, the block manifest excludes it.
    const html = renderInventoryPrimaryBlock(inventory, { ...columns, inventoryNumber: true })
    expect(html).not.toContain("<th>Inv #</th>")
  })

  it("renders an em-dash for a blank value", () => {
    const html = renderInventoryPrimaryBlock(makeInventoryDetail({ location: "" }), {
      ...columns,
      location: true,
    })
    expect(html).toContain(`<th>Location</th><td>${EMPTY_CELL}</td>`)
  })

  it("renders nothing when no field is checked", () => {
    const allOff = Object.fromEntries(Object.keys(columns).map((key) => [key, false]))
    expect(renderInventoryPrimaryBlock(inventory, allOff)).toBe("")
  })
})

describe("renderInventoryAdjustments — column + row gating", () => {
  const adjustments = [
    makeAdjustment({ id: "a1", quantity: "10", rollNumber: "R1" }),
    makeAdjustment({ id: "a2", quantity: "5", rollNumber: "R2" }),
  ]

  it("shows only the checked columns", () => {
    const html = renderInventoryAdjustments(adjustments, {
      columns: { quantity: true, rollNumber: true },
    })
    expect(html).toContain('<th class="cl-num">Quantity</th>')
    expect(html).toContain("<th>Roll #</th>")
    expect(html).not.toContain("<th>Location</th>")
  })

  it("filters to the selected rows", () => {
    const html = renderInventoryAdjustments(adjustments, {
      columns: { rollNumber: true },
      selectedIds: ["a1"],
    })
    expect(html).toContain("R1")
    expect(html).not.toContain("R2")
  })

  it("renders nothing when no rows are selected", () => {
    expect(
      renderInventoryAdjustments(adjustments, { columns: { quantity: true }, selectedIds: [] }),
    ).toBe("")
  })

  it("renders nothing when no columns are checked", () => {
    expect(renderInventoryAdjustments(adjustments, { columns: {} })).toBe("")
  })
})
