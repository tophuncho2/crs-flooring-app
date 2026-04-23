export const CONTACT_TYPE_OPTIONS = ["SALES_REP", "CONTRACTOR", "OTHER"] as const

export type ContactType = (typeof CONTACT_TYPE_OPTIONS)[number]

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  SALES_REP: "Sales Rep",
  CONTRACTOR: "Contractor",
  OTHER: "Other",
}

export type ContactRow = {
  id: string
  name: string
  type: ContactType
  typeLabel: string
  createdAt: string
  updatedAt: string
}

export type ContactDetail = ContactRow

export type ContactForm = {
  name: string
  type: ContactType | ""
}

export const EMPTY_CONTACT_FORM: ContactForm = {
  name: "",
  type: "",
}

export function validateContactType(value: string): value is ContactType {
  return CONTACT_TYPE_OPTIONS.includes(value as ContactType)
}

export function validateContactForm(input: ContactForm) {
  if (!input.name.trim()) return "Contact name is required"
  if (!input.type.trim()) return "Contact type is required"
  if (!validateContactType(input.type)) return "Contact type must be Sales Rep, Contractor, or Other"
  return ""
}

export function toContactForm(contact: ContactDetail): ContactForm {
  return {
    name: contact.name,
    type: contact.type,
  }
}
