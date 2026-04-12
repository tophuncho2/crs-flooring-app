import {
  listContacts as dbListContacts,
  listSalesRepContactOptions as dbListSalesRepContactOptions,
  getContactById as dbGetContactById,
  type ContactRecord,
} from "@builders/db"
import {
  createPrismaPageLoadIssue,
  isPrismaNotFoundError,
  withPrismaConnectivityHandling,
  type PrismaDetailPageResult,
  type PrismaPageDataResult,
} from "@builders/db"

export type { ContactRecord }

export async function listContacts() {
  return dbListContacts()
}

export async function listSalesRepContactOptions() {
  return dbListSalesRepContactOptions()
}

export async function getContactById(id: string) {
  return dbGetContactById(id)
}

export async function getContactsPageData(): Promise<PrismaPageDataResult<{ contacts: ContactRecord[] }>> {
  return withPrismaConnectivityHandling(async () => ({
    contacts: await dbListContacts(),
  }))
}

export async function getContactDetailPageData(id: string): Promise<PrismaDetailPageResult<{ contact: ContactRecord }>> {
  try {
    const contact = await dbGetContactById(id)

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
