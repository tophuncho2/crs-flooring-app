import { describe, expect, it } from "vitest"
import { buildWorkOrderPickingTicketHtml } from "../../../../src/flooring/work-orders/file-generation/build-work-order-picking-ticket-html.js"
import { buildWorkOrderSlipHtml } from "../../../../src/flooring/work-orders/file-generation/build-work-order-slip-html.js"
import { makeFileGenInput, makeMaterialItem } from "./_fixtures.js"

// Everything above the adjustments table = the slice of the document before the
// adjustments `<table class="flat-rows">` (the style block, page-frame open,
// header band, and shared info stack).
const ADJUSTMENTS_TABLE_MARKER = '<table class="flat-rows">'

function preamble(html: string): string {
  const idx = html.indexOf(ADJUSTMENTS_TABLE_MARKER)
  expect(idx, "expected the adjustments table marker to be present").toBeGreaterThan(-1)
  return html.slice(0, idx)
}

// One fixture carrying a material item + adjustment so BOTH documents actually
// render the adjustments table (and therefore the marker we slice on).
const input = makeFileGenInput({ materialItems: [makeMaterialItem()] })
const options = { logoUrl: "https://bucket.example/logo.png" }

describe("work-order documents — above the adjustments table", () => {
  it("the slip and picking ticket are identical except for the title tag", () => {
    const slipPreamble = preamble(buildWorkOrderSlipHtml(input, options))
    const pickingPreamble = preamble(buildWorkOrderPickingTicketHtml(input, options))

    // Normalize the one intentional difference — the document-type tag — then
    // assert byte-for-byte equality of everything above the table.
    const normalizedPicking = pickingPreamble.replace(
      '<span class="page-tag">Picking Ticket</span>',
      '<span class="page-tag">Work Order</span>',
    )

    expect(normalizedPicking).toEqual(slipPreamble)
  })

  it("the two preambles differ ONLY by the tag (sanity: un-normalized they are not equal)", () => {
    const slipPreamble = preamble(buildWorkOrderSlipHtml(input, options))
    const pickingPreamble = preamble(buildWorkOrderPickingTicketHtml(input, options))

    expect(pickingPreamble).not.toEqual(slipPreamble)
    expect(slipPreamble).toContain('<span class="page-tag">Work Order</span>')
    expect(pickingPreamble).toContain('<span class="page-tag">Picking Ticket</span>')
  })

  it("matches the characterization snapshot of the shared preamble", () => {
    // Tag normalized out so the snapshot captures the shared region only.
    const shared = preamble(buildWorkOrderSlipHtml(input, options))
    expect(shared).toMatchInlineSnapshot(`
      "<style>
        @page { size: letter; margin: 0; }
        .wo-print-root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #111; font-size: 12px; padding: 0 0.25in 0.25in 0.25in; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        .wo-print-root h2 { font-size: 14px; margin: 18px 0 6px 0; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
        .wo-print-root h3 { font-size: 12px; font-weight: 600; margin: 10px 0 4px 0; }
        .wo-print-root table { width: 100%; border-collapse: collapse; margin: 6px 0; }
        .wo-print-root .wo-top-table th, .wo-print-root .wo-top-table td { border: 0; padding: 3px 8px; text-align: left; vertical-align: top; }
        .wo-print-root .wo-top-table th { font-weight: 600; white-space: nowrap; padding-right: 16px; }
        .wo-print-root .wo-top-table tr.row-gap > th, .wo-print-root .wo-top-table tr.row-gap > td { padding-top: 12px; }
        .wo-print-root .wo-mid { display: flex; align-items: flex-start; margin: 6px 0; }
        .wo-print-root .wo-mid-left { flex: 0 0 58%; margin: 0; }
        .wo-print-root .wo-mid-right { flex: 1 1 auto; margin: 8px 0; padding-left: 16px; border-left: 1px solid #ddd; }
        .wo-print-root .wo-mid-left table, .wo-print-root .wo-mid-right table { margin: 0; }
        .wo-print-root .wo-mid-right th { padding-right: 4px; }
        .wo-print-root .wo-top-grid { border-bottom: 1px solid #ddd; table-layout: fixed; width: 100%; }
        .wo-print-root .wo-top-grid th, .wo-print-root .wo-top-grid td { border: 0; padding: 3px 8px; text-align: left; vertical-align: top; overflow-wrap: break-word; }
        .wo-print-root .wo-top-grid th { font-weight: 600; white-space: nowrap; padding-right: 4px; }
        .wo-print-root .property-info-table { table-layout: fixed; }
        .wo-print-root .property-info-table th { width: 14%; }
        .wo-print-root .property-info-table td { width: 26%; }
        .wo-print-root .property-info-address { width: 60%; }
        .wo-print-root .flat-rows { width: 100%; border-collapse: collapse; table-layout: auto; margin: 12px 0 0 0; }
        .wo-print-root .flat-rows th, .wo-print-root .flat-rows td { border: 0; padding: 3px 6px; font-size: 13px; text-align: left; vertical-align: top; white-space: nowrap; }
        .wo-print-root .flat-rows th:first-child, .wo-print-root .flat-rows td:first-child { width: 100%; white-space: normal; overflow-wrap: anywhere; word-break: break-word; }
        .wo-print-root .flat-rows th { font-weight: 600; border-bottom: 1px solid #111; padding-bottom: 2px; }
        .wo-print-root .flat-rows tbody tr:nth-child(even) { background: #f0f0f0; }
        .wo-print-root .flat-rows .cl-num { text-align: right; }
        .wo-print-root .flat-rows .subtotal-cell { border-top: 1px solid #111; padding-top: 3px; }
        .wo-print-root .flat-rows tr.group-end td { border-bottom: 1px solid #111; }
        .wo-print-root .flat-rows td.note-cell { white-space: normal; overflow-wrap: anywhere; }
        .wo-print-root .page-header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; margin: 0 0 14px 0; }
        .wo-print-root .page-header > span { font-size: 16px; font-weight: 600; }
        .wo-print-root .page-brand { justify-self: start; }
        .wo-print-root .page-logo { justify-self: start; height: 56px; width: auto; }
        .wo-print-root .page-number { justify-self: end; }
        .wo-print-root .multiline { white-space: pre-wrap; overflow-wrap: break-word; }
        .wo-print-root .empty-cell { color: #666; }
        .wo-print-root .page-frame { margin: 0; table-layout: fixed; }
        .wo-print-root .page-frame > thead { display: table-header-group; }
        .wo-print-root .page-frame > thead > tr > td { border: 0; padding: 0.5in 0 0 0; }
        .wo-print-root .page-frame > tbody > tr > td { border: 0; padding: 0; }
      </style>
      <div class="wo-print-root">
      <table class="page-frame">
        <thead>
          <tr><td><div class="page-header">
        <img class="page-logo" src="https://bucket.example/logo.png" alt="CRS Floor Covering" />
        <span class="page-tag">Work Order</span>
        <span class="page-number">WO-1001</span>
      </div></td></tr>
        </thead>
        <tbody>
          <tr><td>
      <table class="wo-top-grid">
        <colgroup>
          <col style="width: 13%;" />
          <col style="width: 37%;" />
          <col style="width: 13%;" />
          <col style="width: 37%;" />
        </colgroup>
        <tbody>
          <tr>
            <th>Date</th><td>2026-06-08 - AM</td>
            <th>Warehouse</th><td>North Warehouse - 5 Depot Rd, Round Rock, TX, 78664 - (512) 555-0100</td>
          </tr>
          <tr>
            <th>Job Type</th><td>Turn</td>
            <th></th><td></td>
          </tr>
        </tbody>
      </table>
      <div class="wo-mid">
        <table class="wo-top-table wo-mid-left">
          <colgroup>
            <col style="width: 1%;" />
            <col />
          </colgroup>
          <tbody>
            <tr><th>Management Company</th><td>Cardinal Management</td></tr>
            <tr><th>Property</th><td>Maple Court Apartments</td></tr>
          <tr><th>Property Address</th><td>100 Maple St, Austin, TX, 78701</td></tr>
          </tbody>
        </table>
        <table class="wo-top-table wo-mid-right">
          <colgroup>
            <col style="width: 1%;" />
            <col />
          </colgroup>
          <tbody>
            <tr><th>Unit Type</th><td>2 Bed / 1 Bath</td></tr>
            <tr><th>Unit Number</th><td>12B</td></tr>
            <tr><th>Vacancy</th><td>Vacant</td></tr>
          </tbody>
        </table>
      </div>
      "
    `)
  })
})
