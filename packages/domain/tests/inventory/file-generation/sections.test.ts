import { describe, expect, it } from "vitest"
import {
  renderInventoryDocumentHeader,
  renderInventoryPrimaryBlock,
  renderInventoryWriteInGrid,
} from "../../../src/inventory/file-generation/inventory-document-sections.js"
import { buildInventoryPrintConfig } from "../../../src/inventory/file-generation/print-presets.js"
import { INVENTORY_PRINT_LEDGER_ROW_COUNT } from "../../../src/inventory/file-generation/types.js"
import { EMPTY_CELL, makeInventoryDetail } from "./_fixtures.js"

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

describe("renderInventoryPrimaryBlock — roll-tag heading + cell gating", () => {
  const inventory = makeInventoryDetail()
  const columns = buildInventoryPrintConfig().inventoryColumns

  it("renders the big Roll# heading from prefix + number", () => {
    const html = renderInventoryPrimaryBlock(inventory, columns)
    expect(html).toContain('<div class="inv-roll-number">ROLL#88</div>')
  })

  it("renders the four checked cells with their composed values", () => {
    const html = renderInventoryPrimaryBlock(inventory, columns)
    expect(html).toContain('<span class="inv-cell-label">Style</span><span class="inv-cell-value">Berber</span>')
    expect(html).toContain('<span class="inv-cell-label">Color</span><span class="inv-cell-value">Oatmeal</span>')
    expect(html).toContain(
      '<span class="inv-cell-label">Starting Stock</span><span class="inv-cell-value">500</span>',
    )
    // Created Date is Eastern date-only (2026-06-30 12:00Z => 8 AM EDT, same day).
    expect(html).toContain(
      '<span class="inv-cell-label">Created Date</span><span class="inv-cell-value">06/30/2026</span>',
    )
  })

  it("drops an unchecked cell", () => {
    const html = renderInventoryPrimaryBlock(inventory, { ...columns, productColor: false })
    expect(html).not.toContain('<span class="inv-cell-label">Color</span>')
  })

  it("renders an em-dash for a blank cell value", () => {
    const html = renderInventoryPrimaryBlock(makeInventoryDetail({ productStyle: "" }), columns)
    expect(html).toContain(`<span class="inv-cell-label">Style</span><span class="inv-cell-value">${EMPTY_CELL}</span>`)
  })

  it("still renders the Roll# heading when no cell is checked (heading is not a togglable cell)", () => {
    const allOff = Object.fromEntries(Object.keys(columns).map((key) => [key, false]))
    const html = renderInventoryPrimaryBlock(inventory, allOff)
    expect(html).toContain('<div class="inv-roll-number">ROLL#88</div>')
    expect(html).not.toContain('class="inv-cell-grid"')
  })
})

describe("renderInventoryWriteInGrid — blank hand-write form", () => {
  const html = renderInventoryWriteInGrid()

  it("renders the three rotated header labels", () => {
    expect(html).toContain('<span class="rot">Date</span>')
    expect(html).toContain('<span class="rot">Adjustment</span>')
    expect(html).toContain('<span class="rot">Balance</span>')
  })

  it("renders exactly INVENTORY_PRINT_LEDGER_ROW_COUNT empty rows and no data", () => {
    const emptyRows = html.match(/<tr><td><\/td><td><\/td><td><\/td><\/tr>/g) ?? []
    expect(emptyRows).toHaveLength(INVENTORY_PRINT_LEDGER_ROW_COUNT)
  })
})
