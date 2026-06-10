import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeContact,
  normalizeContactOption,
  type Contact,
  type ContactListRow,
  type ContactOption,
} from "@builders/domain"

type ContactsDbClient = PrismaClient | Prisma.TransactionClient

export type ContactListViewOptions = {
  search?: string
  skip: number
  take: number
}

export type ContactListViewResult = {
  rows: ContactListRow[]
  total: number
}

export async function listContactsForListView(
  options: ContactListViewOptions,
  client: ContactsDbClient = db,
): Promise<ContactListViewResult> {
  const where: Prisma.FlooringContactWhereInput | undefined = options.search
    ? { name: { contains: options.search, mode: "insensitive" } }
    : undefined

  const [total, rows] = await Promise.all([
    client.flooringContact.count({ where }),
    client.flooringContact.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: options.skip,
      take: options.take,
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeContact),
  }
}

export async function getContactById(
  id: string,
  client: ContactsDbClient = db,
): Promise<Contact> {
  const contact = await client.flooringContact.findUniqueOrThrow({
    where: { id },
  })
  return normalizeContact(contact)
}

export async function countContacts(client: ContactsDbClient = db): Promise<number> {
  return client.flooringContact.count()
}

export type ContactOptionsSearchArgs = {
  search?: string
  take: number
}

export async function searchContactOptions(
  args: ContactOptionsSearchArgs,
  client: ContactsDbClient = db,
): Promise<ContactOption[]> {
  const where = args.search
    ? { name: { contains: args.search, mode: "insensitive" as const } }
    : undefined

  const contacts = await client.flooringContact.findMany({
    where,
    orderBy: { name: "asc" },
    take: args.take,
    select: { id: true, name: true },
  })
  return contacts.map(normalizeContactOption)
}
