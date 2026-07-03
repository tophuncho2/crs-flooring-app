import {
  createPrismaPageLoadIssue,
  getInviteRecordById,
  type PrismaDetailPageResult,
} from "@builders/db"
import type { Invite } from "@builders/domain"

export type InviteDetailPageData = {
  invite: Invite
}

export async function getInviteDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<InviteDetailPageData>> {
  try {
    const invite = await getInviteRecordById(id)
    if (!invite) {
      return { ok: false, notFound: true }
    }
    return { ok: true, data: { invite } }
  } catch (error) {
    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "INVITE_DETAIL_LOAD_FAILED",
        title: "Invite Unavailable",
        message: "The app could not load this invite.",
        detail: "The invite record could not be loaded.",
      }),
    }
  }
}
