import {
  createPrismaPageLoadIssue,
  getContactById,
  isPrismaNotFoundError,
  type PrismaDetailPageResult,
} from "@builders/db"
import type { Contact } from "@builders/domain"

export type ContactDetailPageData = {
  contact: Contact
}

export async function getContactDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<ContactDetailPageData>> {
  try {
    const contact = await getContactById(id)
    return { ok: true, data: { contact } }
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
