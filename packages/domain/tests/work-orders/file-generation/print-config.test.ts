import { describe, expect, it } from "vitest"
import { buildWorkOrderPrintHtml } from "../../../../src/flooring/work-orders/file-generation/build-work-order-print-html.js"
import {
  buildWorkOrderPrintConfig,
  WORK_ORDER_DOCUMENT_LABELS,
} from "../../../../src/flooring/work-orders/file-generation/print-presets.js"
import {
  renderWorkOrderAdjustments,
  renderWorkOrderInfo,
  renderWorkOrderMaterialItems,
} from "../../../../src/flooring/work-orders/file-generation/work-order-document-sections.js"
import {
  makeAdjustment,
  makeFileGenInput,
  makeMaterialItem,
  makeMaterialItemGroup,
  makeMaterialItemRow,
} from "./_fixtures.js"

describe("presets seed the right document", () => {
  it("pickingTicket → adjustments mode with all detail columns", () => {
    const config = buildWorkOrderPrintConfig("pickingTicket")
    expect(config.mode).toBe("adjustments")
    expect(config.documentLabel).toBe("Picking Ticket")
    expect(config.adjustmentColumns).toEqual({
      dyeLot: true,
      rollNumber: true,
      adjustment: true,
      location: true,
    })
  })

  it("slip → adjustments mode with no detail columns", () => {
    const config = buildWorkOrderPrintConfig("slip")
    expect(config.mode).toBe("adjustments")
    expect(config.documentLabel).toBe("Work Order")
    expect(Object.values(config.adjustmentColumns).every((on) => !on)).toBe(true)
  })

  it("planFile → material mode", () => {
    const config = buildWorkOrderPrintConfig("planFile")
    expect(config.mode).toBe("material")
    expect(config.documentLabel).toBe("Plan File")
  })

  it("document-type selector labels mirror the three preset documentLabels", () => {
    expect(WORK_ORDER_DOCUMENT_LABELS).toEqual([
      buildWorkOrderPrintConfig("pickingTicket").documentLabel,
      buildWorkOrderPrintConfig("slip").documentLabel,
      buildWorkOrderPrintConfig("planFile").documentLabel,
    ])
  })
})

describe("renderWorkOrderInfo — top-field gating", () => {
  const topFields = {
    date: true,
    warehouse: true,
    jobType: true,
    description: true,
    entity: true,
    property: true,
    propertyAddress: true,
    propertyInstructions: true,
    installerInstructions: true,
    unitType: true,
    unitNumber: true,
    vacancy: true,
  }

  it("drops the Entity row when entity is unchecked", () => {
    const html = renderWorkOrderInfo(makeFileGenInput(), { ...topFields, entity: false })
    expect(html).not.toContain("<th>Entity</th>")
    expect(html).toContain("<th>Property</th>")
  })

  it("empties the Date grid cell when date is unchecked (keeps Warehouse)", () => {
    const html = renderWorkOrderInfo(makeFileGenInput(), { ...topFields, date: false })
    expect(html).not.toContain("<th>Date</th>")
    expect(html).toContain("<th>Warehouse</th>")
  })

  it("drops the entire right column when all its fields are unchecked", () => {
    const html = renderWorkOrderInfo(makeFileGenInput(), {
      ...topFields,
      unitType: false,
      unitNumber: false,
      vacancy: false,
    })
    expect(html).not.toContain("wo-mid-right")
    expect(html).toContain("wo-mid-left")
  })
})

describe("renderWorkOrderAdjustments — column gating", () => {
  const group = makeMaterialItem({
    adjustments: [makeAdjustment({ dyeLot: "DL-9", rollNumber: "R-7", location: "DOCK-9" })],
  })

  it("shows only Dyelot among the detail columns when that is the only one on", () => {
    const html = renderWorkOrderAdjustments([group], {
      columns: { dyeLot: true, rollNumber: false, adjustment: false, location: false },
    })
    expect(html).toContain("<th>Dyelot</th>")
    expect(html).not.toContain("<th>Roll#</th>")
    expect(html).not.toContain("<th>Location</th>")
    expect(html).not.toContain("<th class=\"cl-num\">Adjustment</th>")
  })
})

describe("renderWorkOrderAdjustments — row filtering + subtotal of shown", () => {
  const groups = [
    makeMaterialItem({
      productName: "Shaw Carpet — Beige",
      adjustments: [
        makeAdjustment({ id: "a1", quantity: "10" }),
        makeAdjustment({ id: "a2", quantity: "5" }),
      ],
    }),
  ]

  it("keeps only selected rows and subtotals just those", () => {
    const html = renderWorkOrderAdjustments(groups, {
      columns: { dyeLot: false, rollNumber: false, adjustment: false, location: false },
      selectedIds: ["a1"],
    })
    // a1 (10) shown, a2 (5) dropped → subtotal reflects only the shown row.
    expect(html).toContain(">10 rolls<")
    expect(html).not.toContain(">5 rolls<")
  })

  it("renders nothing when no rows are selected", () => {
    expect(renderWorkOrderAdjustments(groups, { selectedIds: [] })).toBe("")
  })
})

describe("renderWorkOrderMaterialItems — notes gating + row filtering", () => {
  const group = makeMaterialItemGroup({
    materialItems: [
      makeMaterialItemRow({ id: "m1", quantity: "10", notes: "first" }),
      makeMaterialItemRow({ id: "m2", quantity: "5", notes: "second" }),
    ],
  })

  it("drops the Notes column when notes is off", () => {
    const html = renderWorkOrderMaterialItems([group], { columns: { notes: false } })
    expect(html).not.toContain("<th>Notes</th>")
    expect(html).not.toContain("first")
  })

  it("filters to the selected material rows", () => {
    const html = renderWorkOrderMaterialItems([group], { selectedIds: ["m2"] })
    expect(html).toContain("second")
    expect(html).not.toContain("first")
  })
})

describe("buildWorkOrderPrintHtml — mode branch", () => {
  const input = makeFileGenInput({
    adjustmentGroups: [makeMaterialItem()],
    materialItemGroups: [makeMaterialItemGroup()],
  })

  it("adjustments mode renders the adjustments table, not material", () => {
    const html = buildWorkOrderPrintHtml(input, buildWorkOrderPrintConfig("pickingTicket"))
    expect(html).toContain("Picking Ticket")
    expect(html).toContain("<th>Dyelot</th>")
    expect(html).not.toContain("Qty / Unit")
  })

  it("material mode renders the requested-material table, not adjustments", () => {
    const html = buildWorkOrderPrintHtml(input, buildWorkOrderPrintConfig("planFile"))
    expect(html).toContain("Plan File")
    expect(html).toContain("Qty / Unit")
    expect(html).not.toContain("<th>Dyelot</th>")
  })
})
