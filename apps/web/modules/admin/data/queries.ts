import { withPrismaConnectivityHandling, isPrismaNotFoundError, type PrismaDetailPageResult } from "@builders/db"
import type { SessionUser } from "@/server/auth/session"
import { listManagedUsers, getManagedUserById } from "@/server/builder/users"
import type { ManagedUserRow } from "../controller/types"

export async function getAdminUsersPageData(actor: SessionUser) {
  return withPrismaConnectivityHandling(() => listManagedUsers(actor))
}

export async function getAdminUserDetailPageData(
  actor: SessionUser,
  id: string,
): Promise<PrismaDetailPageResult<{ user: ManagedUserRow }>> {
  try {
    const user = await getManagedUserById(actor, id)

    if (!user) {
      return { ok: false, notFound: true }
    }

    return { ok: true, data: { user } }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }
    throw error
  }
}
