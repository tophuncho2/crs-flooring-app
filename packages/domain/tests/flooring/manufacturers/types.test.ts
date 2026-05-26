import { describe, expect, it } from "vitest"
import {
  EMPTY_MANUFACTURER_FORM,
  toManufacturerForm,
  type ManufacturerRow,
} from "../../../src/flooring/manufacturers/types.js"

function row(overrides: Partial<ManufacturerRow> = {}): ManufacturerRow {
  return {
    id: "mfr-1",
    companyName: "Shaw Floors",
    agentName: "Pat Agent",
    website: "shaw.example",
    phone: "555-1212",
    email: "sales@shaw.example",
    productsCount: 4,
    createdAt: "2026-05-26T00:00:00.000Z",
    updatedAt: "2026-05-26T00:00:00.000Z",
    ...overrides,
  }
}

describe("EMPTY_MANUFACTURER_FORM", () => {
  it("is all blank strings", () => {
    expect(EMPTY_MANUFACTURER_FORM).toEqual({
      companyName: "",
      agentName: "",
      website: "",
      phone: "",
      email: "",
    })
  })
})

describe("toManufacturerForm", () => {
  it("copies the editable fields, dropping id/counts/timestamps", () => {
    expect(toManufacturerForm(row())).toEqual({
      companyName: "Shaw Floors",
      agentName: "Pat Agent",
      website: "shaw.example",
      phone: "555-1212",
      email: "sales@shaw.example",
    })
  })
})
