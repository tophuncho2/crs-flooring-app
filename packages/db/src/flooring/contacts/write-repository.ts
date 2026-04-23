import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"
import { normalizeContactDetail, type ContactRecord } from "./read-repository.js"

type ContactDbClient = PrismaClient | Prisma.TransactionClient

type ContactType = "SALES_REP" | "CONTRACTOR" | "OTHER"

export async function createContactRecord(
  input: { name: string; type: ContactType },
  client: ContactDbClient = db,
): Promise<ContactRecord> {
  const contact = await client.flooringContact.create({
    data: {
      name: input.name.trim(),
      type: input.type,
    },
  })

  return normalizeContactDetail(contact)
}

export async function updateContactRecord(
  id: string,
  input: { name: string; type: ContactType },
  client: ContactDbClient = db,
): Promise<ContactRecord> {
  const contact = await client.flooringContact.update({
    where: { id },
    data: {
      name: input.name.trim(),
      type: input.type,
    },
  })

  return normalizeContactDetail(contact)
}

export async function deleteContactRecordById(
  id: string,
  client: ContactDbClient = db,
): Promise<void> {
  await client.flooringContact.delete({
    where: { id },
  })
}
