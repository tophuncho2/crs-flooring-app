import type { ContactRecord } from "@builders/db"

export type ContactInput = {
  name: string
  type: "SALES_REP" | "CONTRACTOR" | "OTHER"
}

export type ContactResult = ContactRecord
