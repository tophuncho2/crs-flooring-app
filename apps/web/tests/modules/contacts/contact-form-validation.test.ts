import { describe, expect, it } from "vitest"
import { validateContactForm, type ContactForm } from "@/modules/contacts/domain/types"

describe("validateContactForm", () => {
  it("rejects an empty name", () => {
    const form: ContactForm = { name: "", type: "SALES_REP" }
    expect(validateContactForm(form)).toBe("Contact name is required")
  })

  it("rejects a whitespace-only name", () => {
    const form: ContactForm = { name: "   ", type: "SALES_REP" }
    expect(validateContactForm(form)).toBe("Contact name is required")
  })

  it("rejects an empty type", () => {
    const form: ContactForm = { name: "Jane Rep", type: "" }
    expect(validateContactForm(form)).toBe("Contact type is required")
  })

  it("rejects an invalid type", () => {
    const form = { name: "Jane Rep", type: "INVALID" } as ContactForm
    expect(validateContactForm(form)).toBe("Contact type must be Sales Rep, Contractor, or Other")
  })

  it("accepts a valid SALES_REP form", () => {
    const form: ContactForm = { name: "Jane Rep", type: "SALES_REP" }
    expect(validateContactForm(form)).toBe("")
  })

  it("accepts a valid CONTRACTOR form", () => {
    const form: ContactForm = { name: "Bob Builder", type: "CONTRACTOR" }
    expect(validateContactForm(form)).toBe("")
  })

  it("accepts a valid OTHER form", () => {
    const form: ContactForm = { name: "Sam Other", type: "OTHER" }
    expect(validateContactForm(form)).toBe("")
  })
})
