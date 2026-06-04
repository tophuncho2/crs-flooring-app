import { describe, expect, it } from "vitest"
import { getSharedFormFieldClass } from "@/engines/record-view/forms/form-field-styles"

describe("getSharedFormFieldClass", () => {
  it("returns the required-empty class set for empty required fields", () => {
    expect(
      getSharedFormFieldClass({
        isRequired: true,
        isEmpty: true,
      }),
    ).toContain("border-rose-500")
  })

  it("returns the required-filled class set for populated required fields", () => {
    expect(
      getSharedFormFieldClass({
        isRequired: true,
        isEmpty: false,
      }),
    ).toContain("border-[var(--panel-border)]")
  })

  it("returns the optional class set for non-required fields", () => {
    expect(
      getSharedFormFieldClass({
        isRequired: false,
        isEmpty: true,
      }),
    ).toContain("border-amber-400/80")
  })
})
