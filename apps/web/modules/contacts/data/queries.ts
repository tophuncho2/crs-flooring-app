import { createPrismaPageLoadIssue, getContactById, isPrismaNotFoundError, listContacts, withPrismaConnectivityHandling, type ContactRecord, type PrismaDetailPageResult, type PrismaPageDataResult } from "@builders/db"

export async function getContactsPageData(): Promise<PrismaPageDataResult<ContactRecord[]>> {
  return withPrismaConnectivityHandling(() => listContacts())
}

export async function getContactDetailPageData(id: string): Promise<PrismaDetailPageResult<ContactRecord>> {
  try {
    const contact = await getContactById(id)
    return { ok: true, data: contact }
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
