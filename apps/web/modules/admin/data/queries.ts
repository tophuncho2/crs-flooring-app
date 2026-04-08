import { withPrismaConnectivityHandling, type PrismaDetailPageResult } from "@builders/db"
import { listManagedUsersUseCase, getManagedUserUseCase, type ManagedUserWithPermissions } from "@builders/application"
import type { GovernableRole } from "@builders/domain"
import type { SessionUser } from "@/server/auth/session"

function toActor(user: SessionUser) {
  return { id: user.id, role: user.role as GovernableRole }
}

export async function getAdminUsersPageData(actor: SessionUser) {
  return withPrismaConnectivityHandling(() => listManagedUsersUseCase(toActor(actor)))
}

export async function getAdminUserDetailPageData(
  actor: SessionUser,
  id: string,
): Promise<PrismaDetailPageResult<{ user: ManagedUserWithPermissions }>> {
  try {
    const user = await getManagedUserUseCase(id, toActor(actor))

    return { ok: true, data: { user } }
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 404) {
      return { ok: false, notFound: true }
    }
    throw error
  }
}
