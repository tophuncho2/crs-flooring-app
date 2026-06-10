import type { Contact, ContactOption } from "./types.js"

type ContactInput = {
  id: string
  name: string
  phone: string | null
  email: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

export function normalizeContact(contact: ContactInput): Contact {
  return {
    id: contact.id,
    name: contact.name,
    phone: contact.phone ?? "",
    email: contact.email ?? "",
    createdAt: contact.createdAt instanceof Date ? contact.createdAt.toISOString() : contact.createdAt,
    updatedAt: contact.updatedAt instanceof Date ? contact.updatedAt.toISOString() : contact.updatedAt,
  }
}

export function normalizeContactOption(contact: { id: string; name: string }): ContactOption {
  return { id: contact.id, name: contact.name }
}
