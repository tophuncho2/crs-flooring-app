import { prisma } from "@/server/db/prisma"
import {
  createPrismaPageLoadIssue,
  isPrismaNotFoundError,
  withPrismaConnectivityHandling,
  type PrismaDetailPageResult,
  type PrismaPageDataResult,
} from "@/server/db/prisma-errors"
import { normalizeContactDetail, normalizeContactRow } from "../domain/services"
import type { ContactDetail, ContactRow } from "../domain/types"

async function loadContacts() {
  const contacts = await prisma.flooringContact.findMany({
    include: {
      _count: {
        select: {
          workOrderSalesReps: true,
        },
      },
    },
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
  })

  return contacts.map(normalizeContactRow)
}

export async function listContacts(): Promise<ContactRow[]> {
  return loadContacts()
}

export async function listSalesRepContactOptions() {
  const contacts = await prisma.flooringContact.findMany({
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

export async function getContactById(id: string): Promise<ContactDetail> {
  const contact = await prisma.flooringContact.findUniqueOrThrow({
    where: { id },
    include: {
      _count: {
        select: {
          workOrderSalesReps: true,
        },
      },
    },
  })

  return normalizeContactDetail(contact)
}

export async function getContactsPageData(): Promise<PrismaPageDataResult<{ contacts: ContactRow[] }>> {
  return withPrismaConnectivityHandling(async () => ({
    contacts: await loadContacts(),
  }))
}

export async function getContactDetailPageData(id: string): Promise<PrismaDetailPageResult<{ contact: ContactDetail }>> {
  try {
    const contact = await getContactById(id)

    return {
      ok: true,
      data: {
        contact,
      },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "CONTACT_DETAIL_LOAD_FAILED",
        title: "Contact Unavailable",
        message: "The app could not load this contact.",
        detail: "The contact record could not be loaded.",
      }),
    }
  }
}
