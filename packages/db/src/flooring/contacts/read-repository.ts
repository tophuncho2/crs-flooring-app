import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"

type ContactDbClient = PrismaClient | Prisma.TransactionClient

// --- Types ---

type ContactType = "SALES_REP" | "CONTRACTOR" | "OTHER"

const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  SALES_REP: "Sales Rep",
  CONTRACTOR: "Contractor",
  OTHER: "Other",
}

export type ContactRecord = {
  id: string
  name: string
  type: ContactType
  typeLabel: string
  assignmentsCount: number
  createdAt: string
  updatedAt: string
}

// --- Normalizers ---

function getContactTypeLabel(type: ContactType) {
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
}): ContactRecord {
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

export function normalizeContactDetail(contact: Parameters<typeof normalizeContactRow>[0]): ContactRecord {
  return normalizeContactRow(contact)
}

// --- Read functions ---

export async function listContacts(client: ContactDbClient = db): Promise<ContactRecord[]> {
  const contacts = await client.flooringContact.findMany({
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
  })

  return contacts.map(normalizeContactRow)
}

export async function listSalesRepContactOptions(client: ContactDbClient = db) {
  const contacts = await client.flooringContact.findMany({
    where: { type: "SALES_REP" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  })

  return contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
  }))
}

export async function getContactById(id: string, client: ContactDbClient = db): Promise<ContactRecord> {
  const contact = await client.flooringContact.findUniqueOrThrow({
    where: { id },
  })

  return normalizeContactDetail(contact)
}

export type ContactDeleteStateResult = {
  id: string
  _count: {
    templateSalesReps: number
    workOrderSalesReps: number
  }
}

export async function getContactDeleteState(
  id: string,
  client: ContactDbClient = db,
): Promise<ContactDeleteStateResult | null> {
  const contact = await client.flooringContact.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!contact) return null

  return { id: contact.id, _count: { templateSalesReps: 0, workOrderSalesReps: 0 } }
}
