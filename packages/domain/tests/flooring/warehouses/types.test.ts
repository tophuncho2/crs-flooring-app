import { describe, expect, it } from "vitest"
import {
  EMPTY_WAREHOUSE_FORM,
  toWarehouseForm,
  type WarehouseRow,
} from "../../../src/flooring/warehouses/types.js"

function row(overrides: Partial<WarehouseRow> = {}): WarehouseRow {
  return {
    id: "wh-1",
    name: "Main Depot",
    streetAddress: "1 Main St",
    city: "Austin",
    state: "TX",
    postalCode: "78701",
    fullAddress: "1 Main St, Austin, TX 78701",
    phone: "555-1212",
    workOrdersCount: 0,
    createdAt: "2026-05-26T00:00:00.000Z",
    updatedAt: "2026-05-26T00:00:00.000Z",
    ...overrides,
  }
}

describe("EMPTY_WAREHOUSE_FORM", () => {
  it("is all blank strings", () => {
    expect(EMPTY_WAREHOUSE_FORM).toEqual({
      name: "",
      streetAddress: "",
      city: "",
      state: "",
      postalCode: "",
      phone: "",
    })
  })
})

describe("toWarehouseForm", () => {
  it("copies the editable fields from a row", () => {
    expect(toWarehouseForm(row())).toEqual({
      name: "Main Depot",
      streetAddress: "1 Main St",
      city: "Austin",
      state: "TX",
      postalCode: "78701",
      phone: "555-1212",
    })
  })

  it("coalesces a null phone to an empty string", () => {
    expect(toWarehouseForm(row({ phone: null })).phone).toBe("")
  })
})
