import { describe, expect, it } from "vitest"
import {
  renderWorkOrderHeader,
  renderWorkOrderPickingTicketHeader,
} from "../../../../src/flooring/work-orders/file-generation/work-order-document-sections.js"
import { makeFileGenInput } from "./_fixtures.js"

describe("renderWorkOrderHeader / renderWorkOrderPickingTicketHeader — tag", () => {
  it("slip header carries the 'Work Order' tag", () => {
    const html = renderWorkOrderHeader(makeFileGenInput(), null)
    expect(html).toContain('<span class="page-tag">Work Order</span>')
    expect(html).not.toContain("Picking Ticket")
  })

  it("picking-ticket header carries the 'Picking Ticket' tag", () => {
    const html = renderWorkOrderPickingTicketHeader(makeFileGenInput(), null)
    expect(html).toContain('<span class="page-tag">Picking Ticket</span>')
  })
})

describe("renderWorkOrderHeader — work-order number", () => {
  it("renders the work-order number", () => {
    const html = renderWorkOrderHeader(makeFileGenInput({ workOrderNumber: "WO-2042" }), null)
    expect(html).toContain('<span class="page-number">WO-2042</span>')
  })

  it("HTML-escapes the work-order number", () => {
    const html = renderWorkOrderHeader(makeFileGenInput({ workOrderNumber: 'WO-<&">' }), null)
    expect(html).toContain("WO-&lt;&amp;&quot;&gt;")
    expect(html).not.toContain('WO-<&">')
  })
})

describe("renderWorkOrderHeader — logo vs brand fallback", () => {
  it("renders the logo <img> when a logoUrl is supplied", () => {
    const html = renderWorkOrderHeader(makeFileGenInput(), "https://bucket.example/logo.png")
    expect(html).toContain('<img class="page-logo"')
    expect(html).toContain('src="https://bucket.example/logo.png"')
    expect(html).not.toContain('class="page-brand"')
  })

  it("escapes the logo URL", () => {
    const html = renderWorkOrderHeader(makeFileGenInput(), 'https://x/?a=1&b="2"')
    expect(html).toContain("https://x/?a=1&amp;b=&quot;2&quot;")
  })

  it("falls back to brand text when logoUrl is null", () => {
    const html = renderWorkOrderHeader(makeFileGenInput(), null)
    expect(html).toContain('<span class="page-brand">CRS Floor Covering</span>')
    expect(html).not.toContain("page-logo")
  })

  it("falls back to brand text when logoUrl is omitted", () => {
    const html = renderWorkOrderHeader(makeFileGenInput())
    expect(html).toContain('<span class="page-brand">CRS Floor Covering</span>')
  })
})
