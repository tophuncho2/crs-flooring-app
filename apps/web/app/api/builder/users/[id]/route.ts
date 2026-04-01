import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { deleteManagedUser, normalizeManagedUserUpdateInput, updateManagedUser } from "@/server/builder/users"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy } from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "users.manage",
    rateLimit: {
      scope: "users.update",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      route: "/api/builder/users/[id]",
    },
  })
  if (access instanceof Response) return access

  const { id } = await params

  try {
    const body = await request.json().catch(() => null)
    const user = await withMutationTelemetry(
      access,
      {
        message: "User governance updated",
        action: "users.update",
        route: "/api/builder/users/[id]",
        entityType: "user",
        entityId: id,
      },
      () => updateManagedUser(access.user, id, normalizeManagedUserUpdateInput(body)),
    )

    return routeJson(access, { user })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "users.manage",
    rateLimit: {
      scope: "users.delete",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/builder/users/[id]",
    },
  })
  if (access instanceof Response) return access

  const { id } = await params

  try {
    await withMutationTelemetry(
      access,
      {
        message: "User deleted",
        action: "users.delete",
        route: "/api/builder/users/[id]",
        entityType: "user",
        entityId: id,
      },
      () => deleteManagedUser(access.user, id),
    )

    return routeJson(access, { success: true })
  } catch (error) {
    return routeError(access, error)
  }
}
