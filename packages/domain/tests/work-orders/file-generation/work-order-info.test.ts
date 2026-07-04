import { describe, expect, it } from "vitest"
import { renderWorkOrderInfo } from "../../../src/work-orders/file-generation/work-order-document-sections.js"
import { EMPTY_CELL, makeFileGenInput } from "./_fixtures.js"

describe("renderWorkOrderInfo — always-present rows", () => {
  const html = renderWorkOrderInfo(makeFileGenInput())

  it("renders the Date row with scheduled date and time of day", () => {
    expect(html).toContain("<th>Date</th><td>2026-06-08 - AM</td>")
  })

  it("renders the Job Type row", () => {
    expect(html).toContain("<th>Job Type</th><td>Turn</td>")
  })

  it("renders the Entity row", () => {
    expect(html).toContain("<th>Entity</th><td>Cardinal Management</td>")
  })

  it("renders the Property row", () => {
    expect(html).toContain("<th>Property</th><td>Maple Court Apartments</td>")
  })

  it("renders the Unit Type and Unit Number rows", () => {
    expect(html).toContain("<th>Unit Type</th><td>2 Bed / 1 Bath</td>")
    expect(html).toContain("<th>Unit Number</th><td>12B</td>")
  })
})

describe("renderWorkOrderInfo — warehouse cell composition", () => {
  it("joins name, address line, and phone with ' - '", () => {
    const html = renderWorkOrderInfo(makeFileGenInput())
    expect(html).toContain(
      "<th>Warehouse</th><td>North Warehouse - 5 Depot Rd, Round Rock, TX, 78664 - (512) 555-0100</td>",
    )
  })

  it("filters blank warehouse parts (name + phone only)", () => {
    const html = renderWorkOrderInfo(
      makeFileGenInput({
        warehouse: { streetAddress: "", city: "", state: "", postalCode: "" },
      }),
    )
    expect(html).toContain("<th>Warehouse</th><td>North Warehouse - (512) 555-0100</td>")
  })

  it("renders the empty-cell placeholder when every warehouse part is blank", () => {
    const html = renderWorkOrderInfo(
      makeFileGenInput({
        warehouse: {
          name: "",
          streetAddress: "",
          city: "",
          state: "",
          postalCode: "",
          phone: "",
        },
      }),
    )
    expect(html).toContain(`<th>Warehouse</th><td>${EMPTY_CELL}</td>`)
  })
})

describe("renderWorkOrderInfo — conditional rows present when set", () => {
  it("includes Description when present", () => {
    const html = renderWorkOrderInfo(makeFileGenInput({ description: "Rush job" }))
    expect(html).toContain("<th>Description</th>")
    expect(html).toContain("Rush job")
  })

  it("includes the Address line built from the WO-owned address columns", () => {
    const html = renderWorkOrderInfo(makeFileGenInput())
    expect(html).toContain("<th>Address</th><td>100 Maple St, Austin, TX, 78701</td>")
  })

  it("includes Property Instructions when present", () => {
    const html = renderWorkOrderInfo(
      makeFileGenInput({ property: { instructions: "Gate code 4321" } }),
    )
    expect(html).toContain("<th>Property Instructions</th>")
    expect(html).toContain("Gate code 4321")
  })

  it("includes Installer Instructions when present", () => {
    const html = renderWorkOrderInfo(makeFileGenInput({ installerInstructions: "Use back stairs" }))
    expect(html).toContain("<th>Installer Instructions</th>")
    expect(html).toContain("Use back stairs")
  })
})

describe("renderWorkOrderInfo — conditional rows absent when blank", () => {
  // The WO-owned address renders by default, so the Address row is present;
  // blank out the WO-owned address fields too for the omission case.
  const html = renderWorkOrderInfo(
    makeFileGenInput({
      description: "",
      installerInstructions: "",
      streetAddress: "",
      city: "",
      state: "",
      postalCode: "",
      property: { instructions: "" },
    }),
  )

  it("omits Description", () => {
    expect(html).not.toContain("<th>Description</th>")
  })

  it("omits Address", () => {
    expect(html).not.toContain("<th>Address</th>")
  })

  it("omits Property Instructions", () => {
    expect(html).not.toContain("<th>Property Instructions</th>")
  })

  it("omits Installer Instructions", () => {
    expect(html).not.toContain("<th>Installer Instructions</th>")
  })
})

describe("renderWorkOrderInfo — formatters", () => {
  it("renders a hyphen for a null time of day in the Date row", () => {
    const html = renderWorkOrderInfo(makeFileGenInput({ timeOfDay: null }))
    expect(html).toContain("<th>Date</th><td>2026-06-08 - -</td>")
  })

  it("formats vacancy VACANT → Vacant", () => {
    const html = renderWorkOrderInfo(makeFileGenInput({ vacancy: "VACANT" }))
    expect(html).toContain("<th>Vacancy</th><td>Vacant</td>")
  })

  it("formats vacancy OCCUPIED → Occupied", () => {
    const html = renderWorkOrderInfo(makeFileGenInput({ vacancy: "OCCUPIED" }))
    expect(html).toContain("<th>Vacancy</th><td>Occupied</td>")
  })

  it("renders the empty-cell placeholder for a null vacancy", () => {
    const html = renderWorkOrderInfo(makeFileGenInput({ vacancy: null }))
    expect(html).toContain(`<th>Vacancy</th><td>${EMPTY_CELL}</td>`)
  })
})

describe("renderWorkOrderInfo — empty-cell placeholders", () => {
  it("renders the placeholder for a blank Job Type", () => {
    const html = renderWorkOrderInfo(makeFileGenInput({ jobTypeName: "" }))
    expect(html).toContain(`<th>Job Type</th><td>${EMPTY_CELL}</td>`)
  })

  it("renders the placeholder for a blank Unit Number", () => {
    const html = renderWorkOrderInfo(makeFileGenInput({ unitNumber: "" }))
    expect(html).toContain(`<th>Unit Number</th><td>${EMPTY_CELL}</td>`)
  })
})

describe("renderWorkOrderInfo — HTML escaping (XSS baseline)", () => {
  it("escapes markup injected into a property name", () => {
    const html = renderWorkOrderInfo(
      makeFileGenInput({ property: { name: '<script>alert("x")</script>' } }),
    )
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;")
  })

  it("escapes ampersands and quotes in instruction text", () => {
    const html = renderWorkOrderInfo(makeFileGenInput({ installerInstructions: `Tom & "Jerry" <b>` }))
    expect(html).toContain("Tom &amp; &quot;Jerry&quot; &lt;b&gt;")
    expect(html).not.toContain("<b>")
  })
})
