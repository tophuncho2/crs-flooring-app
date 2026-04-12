import type { ContactRecord } from "@builders/db"

export type CreateContactInput = {
  name: string
  type: "SALES_REP" | "CONTRACTOR" | "OTHER"
}

export type UpdateContactInput = {
  name: string
  type: "SALES_REP" | "CONTRACTOR" | "OTHER"
}

export type ContactResult = ContactRecord
