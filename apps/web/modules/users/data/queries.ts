import {
  createPrismaPageLoadIssue,
  getUserRecordById,
  type PrismaDetailPageResult,
} from "@builders/db"
import type { User } from "@builders/domain"

export type UserDetailPageData = {
  user: User
}

export async function getUserDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<UserDetailPageData>> {
  try {
    const user = await getUserRecordById(id)
    if (!user) {
      return { ok: false, notFound: true }
    }
    return { ok: true, data: { user } }
  } catch (error) {
    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "USER_DETAIL_LOAD_FAILED",
        title: "User Unavailable",
        message: "The app could not load this user.",
        detail: "The user record could not be loaded.",
      }),
    }
  }
}
