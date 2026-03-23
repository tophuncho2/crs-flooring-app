import { calculateWorkOrderSalesRepExpense } from "./expense-summary"

export type EditableWorkOrderSalesRep = {
  id: string
  contactId: string
  contactName: string
  percent: string
}

export type WorkOrderSalesRepDraft = {
  contactId: string
  percent: string
}

export type SalesRepContactOption = {
  id: string
  name: string
}

export function normalizeWorkOrderSalesRep(item: {
  id: string
  contactId: string
  percent: { toString(): string }
  contact: {
    name: string
  }
}): EditableWorkOrderSalesRep {
  return {
    id: item.id,
    contactId: item.contactId,
    contactName: item.contact.name,
    percent: item.percent.toString(),
  }
}

export function calculateWorkOrderSalesRepLineAmount(customerCost: number, item: Pick<EditableWorkOrderSalesRep, "percent">) {
  return calculateWorkOrderSalesRepExpense(customerCost, [item])
}
