import { describe, expect, it } from "vitest"
import { buildWorkOrderCsv } from "../../../src/work-orders/file-generation/build-work-order-csv.js"
import { buildWorkOrderPrintConfig } from "../../../src/work-orders/file-generation/print-presets.js"
import type { WorkOrderPrintConfig } from "../../../src/work-orders/file-generation/types.js"
import {
  makeAdjustment,
  makeFileGenInput,
  makeMaterialItem,
  makeMaterialItemGroup,
  makeMaterialItemRow,
} from "./_fixtures.js"

const BOM = "﻿"

const ADJ_LABEL = "Adjustments\r\n"
const MAT_LABEL = "Requested Material\r\n"

/**
 * Split the file into its stacked blocks. Block 0 is always the top field
 * table; each following block is label-prefixed, so we key them by section and
 * strip the label so the remainder is just that section's table.
 */
function blocks(csv: string): { top: string; adjustments?: string; material?: string } {
  const [top, ...rest] = csv.split("\r\n\r\n")
  const result: { top: string; adjustments?: string; material?: string } = { top }
  for (const block of rest) {
    if (block.startsWith(ADJ_LABEL)) result.adjustments = block.slice(ADJ_LABEL.length)
    else if (block.startsWith(MAT_LABEL)) result.material = block.slice(MAT_LABEL.length)
  }
  return result
}

/** pickingTicket, but with both bottom sections turned on. */
function bothSectionsConfig(): WorkOrderPrintConfig {
  return { ...buildWorkOrderPrintConfig("pickingTicket"), sections: { adjustments: true, material: true } }
}

describe("buildWorkOrderCsv — top section", () => {
  it("starts with a UTF-8 BOM and a Field,Value header", () => {
    const csv = buildWorkOrderCsv(makeFileGenInput(), buildWorkOrderPrintConfig("pickingTicket"))
    expect(csv.startsWith(`${BOM}Field,Value`)).toBe(true)
  })

  it("emits one row per CHECKED top field, using the shared value resolvers", () => {
    const config = buildWorkOrderPrintConfig("pickingTicket") // all top fields visible
    const { top } = blocks(buildWorkOrderCsv(makeFileGenInput(), config))
    // Composed values mirror the print cells.
    expect(top).toContain("Date,2026-06-08 - AM")
    expect(top).toContain("Job Type,Turn")
    expect(top).toContain("Entity,Cardinal Management")
    expect(top).toContain("Vacancy,Vacant")
    // Warehouse composes name - address - phone; the commas force RFC-4180 quoting.
    expect(top).toContain(
      '"North Warehouse - 5 Depot Rd, Round Rock, TX, 78664 - (512) 555-0100"',
    )
  })

  it("drops a top field when its checkbox is off", () => {
    const config = buildWorkOrderPrintConfig("pickingTicket")
    config.topFields.jobType = false
    const { top } = blocks(buildWorkOrderCsv(makeFileGenInput(), config))
    expect(top).not.toContain("Job Type,")
    expect(top).toContain("Warehouse,")
  })

  it("keeps a checked field with an empty value (machine-friendly blank)", () => {
    const config = buildWorkOrderPrintConfig("pickingTicket")
    const { top } = blocks(buildWorkOrderCsv(makeFileGenInput({ description: "" }), config))
    // Description is checked but blank → the row is present with an empty value.
    expect(top).toContain("Description,\r\n")
  })
})

describe("buildWorkOrderCsv — adjustments (deductions) section", () => {
  const input = makeFileGenInput({
    adjustmentGroups: [
      makeMaterialItem({
        productName: "Shaw Carpet — Beige",
        adjustments: [
          makeAdjustment({ id: "a1", quantity: "10", before: "100", after: "90", dyeLot: "DL-9", rollNumber: "R-7", location: "DOCK-9" }),
          makeAdjustment({ id: "a2", quantity: "5" }),
        ],
      }),
    ],
  })

  it("renders all detail columns + composed values on the pickingTicket preset", () => {
    const { adjustments } = blocks(buildWorkOrderCsv(input, buildWorkOrderPrintConfig("pickingTicket")))
    // Three empty leading columns indent the table so Product sits in column D.
    expect(adjustments?.split("\r\n")[0]).toBe(",,,Adjustment Products,Dyelot,Roll#,Quantity,Adjustment,Location")
    expect(adjustments).toContain(",,,Shaw Carpet — Beige,DL-9,R-7,10 rolls,100 rolls → 90 rolls,DOCK-9")
  })

  it("drops all detail columns on the slip preset (Product + Quantity only)", () => {
    const { adjustments } = blocks(buildWorkOrderCsv(input, buildWorkOrderPrintConfig("slip")))
    expect(adjustments?.split("\r\n")[0]).toBe(",,,Adjustment Products,Quantity")
    expect(adjustments).not.toContain("Dyelot")
  })

  it("honors per-row selection", () => {
    const config = buildWorkOrderPrintConfig("slip")
    config.selectedAdjustmentIds = ["a1"]
    const { adjustments } = blocks(buildWorkOrderCsv(input, config))
    expect(adjustments).toContain("10 rolls")
    expect(adjustments).not.toContain("5 rolls")
  })

  it("empty selection → header-only section (no data rows)", () => {
    const config = buildWorkOrderPrintConfig("slip")
    config.selectedAdjustmentIds = []
    const { adjustments } = blocks(buildWorkOrderCsv(input, config))
    expect(adjustments).toBe(",,,Adjustment Products,Quantity")
  })

  it("is absent when the adjustments section is off", () => {
    // planFile → adjustments off.
    const { adjustments } = blocks(buildWorkOrderCsv(input, buildWorkOrderPrintConfig("planFile")))
    expect(adjustments).toBeUndefined()
  })
})

describe("buildWorkOrderCsv — requested-material section", () => {
  const input = makeFileGenInput({
    materialItemGroups: [
      makeMaterialItemGroup({
        productName: "Shaw Carpet — Beige",
        materialItems: [
          makeMaterialItemRow({ id: "m1", quantity: "10", unitAbbrev: "SF", notes: "first" }),
          makeMaterialItemRow({ id: "m2", quantity: "5", unitAbbrev: "SF", notes: "second" }),
        ],
      }),
    ],
  })

  it("renders the material section with Notes on (planFile preset)", () => {
    const { material } = blocks(buildWorkOrderCsv(input, buildWorkOrderPrintConfig("planFile")))
    expect(material?.split("\r\n")[0]).toBe(",,,Requested Products,Notes,Qty / Unit")
    expect(material).toContain(",,,Shaw Carpet — Beige,first,10 SF")
  })

  it("drops the Notes column when off", () => {
    const config = buildWorkOrderPrintConfig("planFile")
    config.materialColumns.notes = false
    const { material } = blocks(buildWorkOrderCsv(input, config))
    expect(material?.split("\r\n")[0]).toBe(",,,Requested Products,Qty / Unit")
    expect(material).not.toContain("first")
  })

  it("honors per-row selection", () => {
    const config = buildWorkOrderPrintConfig("planFile")
    config.selectedMaterialIds = ["m2"]
    const { material } = blocks(buildWorkOrderCsv(input, config))
    expect(material).toContain("second")
    expect(material).not.toContain("first")
  })

  it("is absent when the material section is off", () => {
    // pickingTicket → material off.
    const { material } = blocks(buildWorkOrderCsv(input, buildWorkOrderPrintConfig("pickingTicket")))
    expect(material).toBeUndefined()
  })
})

describe("buildWorkOrderCsv — both sections on", () => {
  const input = makeFileGenInput({
    adjustmentGroups: [
      makeMaterialItem({
        productName: "Shaw Carpet — Beige",
        adjustments: [makeAdjustment({ id: "a1", quantity: "10" })],
      }),
    ],
    materialItemGroups: [
      makeMaterialItemGroup({
        productName: "Mohawk Vinyl — Grey",
        materialItems: [makeMaterialItemRow({ id: "m1", quantity: "8", unitAbbrev: "SF", notes: "install" })],
      }),
    ],
  })

  it("emits the top block plus BOTH labeled section tables", () => {
    const csv = buildWorkOrderCsv(input, bothSectionsConfig())
    const { top, adjustments, material } = blocks(csv)
    expect(top.startsWith(`${BOM}Field,Value`)).toBe(true)
    expect(adjustments).toContain(",,,Shaw Carpet — Beige")
    expect(material).toContain(",,,Mohawk Vinyl — Grey,install,8 SF")
  })
})
