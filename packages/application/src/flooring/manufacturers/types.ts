import type { ManufacturerRecord } from "@builders/db"

export type ManufacturerInput = {
  companyName: string
  agentName: string
  website: string
  phone: string
  email: string
}

export type ManufacturerResult = ManufacturerRecord
