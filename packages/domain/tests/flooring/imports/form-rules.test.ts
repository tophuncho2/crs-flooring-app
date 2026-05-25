import { describe, expect, it } from "vitest"
import { validateImportPrimaryForm } from "../../../src/flooring/imports/form-rules.js"
import {
  IMPORT_INTERNAL_NOTES_MAX,
  IMPORT_PURCHASE_ORDER_NUMBER_MAX,
} from "../../../src/flooring/imports/column-limits.js"
import type { ImportPrimaryForm } from "../../../src/flooring/imports/types.js"

function form(overrides: Partial<ImportPrimaryForm> = {}): ImportPrimaryForm {
  return {
    purchaseOrderNumber: "",
    internalNotes: "",
    warehouseId: "wh-1",
    manufacturerId: "",
    ...overrides,
  }
}

describe("validateImportPrimaryForm", () => {
  it("returns no issues for a valid form", () => {
    expect(validateImportPrimaryForm(form())).toEqual([])
  })

  it("flags a missing warehouse", () => {
    const issues = validateImportPrimaryForm(form({ warehouseId: "  " }))
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ code: "IMPORT_WAREHOUSE_REQUIRED", field: "warehouseId" })
  })

  it("accepts purchaseOrderNumber at the max length", () => {
    expect(
      validateImportPrimaryForm(form({ purchaseOrderNumber: "x".repeat(IMPORT_PURCHASE_ORDER_NUMBER_MAX) })),
    ).toEqual([])
  })

  it("flags purchaseOrderNumber over the max length", () => {
    const issues = validateImportPrimaryForm(
      form({ purchaseOrderNumber: "x".repeat(IMPORT_PURCHASE_ORDER_NUMBER_MAX + 1) }),
    )
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({
      code: "IMPORT_PURCHASE_ORDER_NUMBER_TOO_LONG",
      field: "purchaseOrderNumber",
    })
  })

  it("accepts internalNotes at the max length", () => {
    expect(
      validateImportPrimaryForm(form({ internalNotes: "x".repeat(IMPORT_INTERNAL_NOTES_MAX) })),
    ).toEqual([])
  })

  it("flags internalNotes over the max length", () => {
    const issues = validateImportPrimaryForm(
      form({ internalNotes: "x".repeat(IMPORT_INTERNAL_NOTES_MAX + 1) }),
    )
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ code: "IMPORT_INTERNAL_NOTES_TOO_LONG", field: "internalNotes" })
  })
})
