import type { ServiceRecord } from "@builders/db"

export type ServiceInput = {
  name: string
  unitId: string
  baseCost: string | number
  notes: string | null
}

export type ServiceResult = ServiceRecord
