import type { LaborPayment } from "./types.js"

type LaborPaymentInput = {
  id: string
  contactId: string
  contact: { name: string } | null
  unit: string | null
  description: string | null
  cost: { toString(): string } | null
  createdAt: Date | string
  updatedAt: Date | string
}

export function normalizeLaborPayment(laborPayment: LaborPaymentInput): LaborPayment {
  return {
    id: laborPayment.id,
    contactId: laborPayment.contactId,
    contactName: laborPayment.contact?.name ?? "",
    unit: laborPayment.unit ?? "",
    description: laborPayment.description ?? "",
    cost: laborPayment.cost == null ? "" : laborPayment.cost.toString(),
    createdAt:
      laborPayment.createdAt instanceof Date ? laborPayment.createdAt.toISOString() : laborPayment.createdAt,
    updatedAt:
      laborPayment.updatedAt instanceof Date ? laborPayment.updatedAt.toISOString() : laborPayment.updatedAt,
  }
}
