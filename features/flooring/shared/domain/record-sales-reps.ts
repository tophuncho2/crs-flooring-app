import { calculateRecordSalesRepExpense } from "./record-expense-summary"

export type EditableRecordSalesRep = {
  id: string
  contactId: string
  contactName: string
  percent: string
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
  contact: {
    name: string
  }
}) {
  return {
    id: item.id,
    contactId: item.contactId,
    contactName: item.contact.name,
    percent: item.percent.toString(),
  }
}

export function calculateRecordSalesRepLineAmount(
  customerCost: number,
  item: Pick<EditableRecordSalesRep, "percent">,
) {
  return calculateRecordSalesRepExpense(customerCost, [item])
}
