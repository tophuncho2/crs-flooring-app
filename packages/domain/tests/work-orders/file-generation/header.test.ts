import { describe, expect, it } from "vitest"
import { renderWorkOrderDocumentHeader } from "../../../src/work-orders/file-generation/work-order-document-sections.js"
import { makeFileGenInput } from "./_fixtures.js"

describe("renderWorkOrderDocumentHeader — tag", () => {
  it("carries the supplied 'Work Order' tag", () => {
    const html = renderWorkOrderDocumentHeader(makeFileGenInput(), "Work Order", null)
    expect(html).toContain('<span class="page-tag">Work Order</span>')
    expect(html).not.toContain("Picking Ticket")
  })

  it("carries the supplied 'Picking Ticket' tag", () => {
    const html = renderWorkOrderDocumentHeader(makeFileGenInput(), "Picking Ticket", null)
    expect(html).toContain('<span class="page-tag">Picking Ticket</span>')
  })
})

describe("renderWorkOrderDocumentHeader — work-order number", () => {
  it("renders the work-order number", () => {
    const html = renderWorkOrderDocumentHeader(
      makeFileGenInput({ workOrderNumber: "WO-2042" }),
      "Work Order",
      null,
    )
    expect(html).toContain('<span class="page-number">WO-2042</span>')
  })

  it("HTML-escapes the work-order number", () => {
    const html = renderWorkOrderDocumentHeader(
      makeFileGenInput({ workOrderNumber: 'WO-<&">' }),
      "Work Order",
      null,
    )
    expect(html).toContain("WO-&lt;&amp;&quot;&gt;")
    expect(html).not.toContain('WO-<&">')
  })
})

describe("renderWorkOrderDocumentHeader — logo vs brand fallback", () => {
  it("renders the logo <img> when a logoUrl is supplied", () => {
    const html = renderWorkOrderDocumentHeader(
      makeFileGenInput(),
      "Work Order",
      "https://bucket.example/logo.png",
    )
    expect(html).toContain('<img class="page-logo"')
    expect(html).toContain('src="https://bucket.example/logo.png"')
    expect(html).not.toContain('class="page-brand"')
  })

  it("escapes the logo URL", () => {
    const html = renderWorkOrderDocumentHeader(
      makeFileGenInput(),
      "Work Order",
      'https://x/?a=1&b="2"',
    )
    expect(html).toContain("https://x/?a=1&amp;b=&quot;2&quot;")
  })

  it("falls back to brand text when logoUrl is null", () => {
    const html = renderWorkOrderDocumentHeader(makeFileGenInput(), "Work Order", null)
    expect(html).toContain('<span class="page-brand">CRS Floor Covering</span>')
    expect(html).not.toContain("page-logo")
  })

  it("falls back to brand text when logoUrl is omitted", () => {
    const html = renderWorkOrderDocumentHeader(makeFileGenInput(), "Work Order")
    expect(html).toContain('<span class="page-brand">CRS Floor Covering</span>')
  })
})
