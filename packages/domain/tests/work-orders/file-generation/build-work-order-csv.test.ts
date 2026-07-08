import { describe, expect, it } from "vitest"
import { buildWorkOrderCsv } from "../../../src/work-orders/file-generation/build-work-order-csv.js"
import { buildWorkOrderPrintConfig } from "../../../src/work-orders/file-generation/print-presets.js"
import {
  makeAdjustment,
  makeFileGenInput,
  makeMaterialItem,
  makeMaterialItemGroup,
  makeMaterialItemRow,
} from "./_fixtures.js"

const BOM = "﻿"

/** Split the file into its two stacked blocks (they're separated by a blank line). */
function blocks(csv: string): { top: string; bottom: string } {
  const [top, bottom] = csv.split("\r\n\r\n")
  return { top, bottom }
}

describe("buildWorkOrderCsv — top section", () => {
  it("starts with a UTF-8 BOM and a Field,Value header", () => {
    const csv = buildWorkOrderCsv(makeFileGenInput(), buildWorkOrderPrintConfig("pickingTicket"))
    expect(csv.startsWith(`${BOM}Field,Value`)).toBe(true)
  })

  it("emits one row per CHECKED top field, using the shared value resolvers", () => {
    const config = buildWorkOrderPrintConfig("pickingTicket") // all top fields visible
    const csv = buildWorkOrderCsv(makeFileGenInput(), config)
    const { top } = blocks(csv)
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

describe("buildWorkOrderCsv — adjustments (deductions) bottom table", () => {
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
    const { bottom } = blocks(buildWorkOrderCsv(input, buildWorkOrderPrintConfig("pickingTicket")))
    expect(bottom.split("\r\n")[0]).toBe("Product,Dyelot,Roll#,Quantity,Adjustment,Location")
    expect(bottom).toContain("Shaw Carpet — Beige,DL-9,R-7,10 rolls,100 rolls → 90 rolls,DOCK-9")
  })

  it("drops all detail columns on the slip preset (Product + Quantity only)", () => {
    const { bottom } = blocks(buildWorkOrderCsv(input, buildWorkOrderPrintConfig("slip")))
    expect(bottom.split("\r\n")[0]).toBe("Product,Quantity")
    expect(bottom).not.toContain("Dyelot")
  })

  it("honors per-row selection", () => {
    const config = buildWorkOrderPrintConfig("slip")
    config.selectedAdjustmentIds = ["a1"]
    const { bottom } = blocks(buildWorkOrderCsv(input, config))
    expect(bottom).toContain("10 rolls")
    expect(bottom).not.toContain("5 rolls")
  })

  it("empty selection → header-only bottom block (no data rows)", () => {
    const config = buildWorkOrderPrintConfig("slip")
    config.selectedAdjustmentIds = []
    const { bottom } = blocks(buildWorkOrderCsv(input, config))
    expect(bottom).toBe("Product,Quantity")
  })
})

describe("buildWorkOrderCsv — requested-material bottom table (material mode)", () => {
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

  it("mirrors config.mode = material with Notes on", () => {
    const { bottom } = blocks(buildWorkOrderCsv(input, buildWorkOrderPrintConfig("planFile")))
    expect(bottom.split("\r\n")[0]).toBe("Product,Notes,Qty / Unit")
    expect(bottom).toContain("Shaw Carpet — Beige,first,10 SF")
  })

  it("drops the Notes column when off", () => {
    const config = buildWorkOrderPrintConfig("planFile")
    config.materialColumns.notes = false
    const { bottom } = blocks(buildWorkOrderCsv(input, config))
    expect(bottom.split("\r\n")[0]).toBe("Product,Qty / Unit")
    expect(bottom).not.toContain("first")
  })

  it("honors per-row selection", () => {
    const config = buildWorkOrderPrintConfig("planFile")
    config.selectedMaterialIds = ["m2"]
    const { bottom } = blocks(buildWorkOrderCsv(input, config))
    expect(bottom).toContain("second")
    expect(bottom).not.toContain("first")
  })
})
