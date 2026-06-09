import { describe, expect, it } from "vitest"
import { buildAddressLine } from "../../../src/shared/address/index.js"

describe("buildAddressLine", () => {
  it("joins street, city, state, and postal with ', '", () => {
    expect(
      buildAddressLine({
        streetAddress: "100 Maple St",
        city: "Austin",
        state: "TX",
        postalCode: "78701",
      }),
    ).toBe("100 Maple St, Austin, TX, 78701")
  })

  it("filters out null parts", () => {
    expect(
      buildAddressLine({
        streetAddress: "100 Maple St",
        city: null,
        state: "TX",
        postalCode: null,
      }),
    ).toBe("100 Maple St, TX")
  })

  it("filters out empty-string parts", () => {
    expect(
      buildAddressLine({
        streetAddress: "",
        city: "Austin",
        state: "",
        postalCode: "78701",
      }),
    ).toBe("Austin, 78701")
  })

  it("returns an empty string when every part is blank", () => {
    expect(
      buildAddressLine({ streetAddress: null, city: null, state: null, postalCode: "" }),
    ).toBe("")
  })
})
