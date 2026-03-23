import type { ContactDetail, ContactRow, ContactType } from "./types"
import { CONTACT_TYPE_LABELS } from "./types"

export function getContactTypeLabel(type: ContactType) {
  return CONTACT_TYPE_LABELS[type]
}

export function normalizeContactRow(contact: {
  id: string
  name: string
  type: ContactType
  createdAt: Date
  updatedAt: Date
  _count?: {
    templateSalesReps: number
    workOrderSalesReps: number
  }
}): ContactRow {
  return {
    id: contact.id,
    name: contact.name,
    type: contact.type,
    typeLabel: getContactTypeLabel(contact.type),
    assignmentsCount: (contact._count?.templateSalesReps ?? 0) + (contact._count?.workOrderSalesReps ?? 0),
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  }
}

export function normalizeContactDetail(contact: Parameters<typeof normalizeContactRow>[0]): ContactDetail {
  return normalizeContactRow(contact)
}
