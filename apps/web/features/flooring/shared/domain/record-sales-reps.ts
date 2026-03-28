import { calculateRecordSalesRepExpense } from "@builders/domain"

export type EditableRecordSalesRep = {
  id: string
  contactId: string
  contactName: string
  percent: string
  updatedAt: string
}

export type RecordSalesRepDraft = {
  contactId: string
  percent: string
}

export type SalesRepContactOption = {
  id: string
  name: string
}

export function normalizeRecordSalesRep(item: {
  id: string
  contactId: string
  percent: { toString(): string }
  updatedAt?: Date | null
  createdAt?: Date | null
  contact: {
    name: string
  }
}) {
  return {
    id: item.id,
    contactId: item.contactId,
    contactName: item.contact.name,
    percent: item.percent.toString(),
    updatedAt: (item.updatedAt ?? item.createdAt ?? new Date(0)).toISOString(),
  }
}

export function calculateRecordSalesRepLineAmount(
  customerCost: number,
  item: Pick<EditableRecordSalesRep, "percent">,
) {
  return calculateRecordSalesRepExpense(customerCost, [item])
}
