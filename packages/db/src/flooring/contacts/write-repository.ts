import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeContact, normalizePhoneNumber, type Contact } from "@builders/domain"

type ContactsDbClient = PrismaClient | Prisma.TransactionClient

export type CreateContactRecordInput = {
  name: string
  phone?: string
  email?: string
}

export type UpdateContactRecordInput = Partial<CreateContactRecordInput>

function optionalString(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

// Phone standard: persist the canonical digits-only form (defensive guard —
// the API validator already normalized, but the data layer is the last gate).
function optionalPhone(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined
  const normalized = normalizePhoneNumber(value)
  return normalized ? normalized : null
}

export async function createContactRecord(
  input: CreateContactRecordInput,
  client: ContactsDbClient = db,
): Promise<Contact> {
  const contact = await client.flooringContact.create({
    data: {
      name: input.name.trim(),
      phone: optionalPhone(input.phone) ?? null,
      email: optionalString(input.email) ?? null,
    },
  })
  return normalizeContact(contact)
}

export async function updateContactRecord(
  id: string,
  input: UpdateContactRecordInput,
  client: ContactsDbClient = db,
): Promise<Contact> {
  const data: Prisma.FlooringContactUpdateInput = {}
  if (input.name !== undefined) data.name = input.name.trim()
  if (input.phone !== undefined) data.phone = optionalPhone(input.phone)
  if (input.email !== undefined) data.email = optionalString(input.email)

  const contact = await client.flooringContact.update({
    where: { id },
    data,
  })
  return normalizeContact(contact)
}

export async function deleteContactRecordById(
  id: string,
  client: ContactsDbClient = db,
): Promise<void> {
  await client.flooringContact.delete({ where: { id } })
}
