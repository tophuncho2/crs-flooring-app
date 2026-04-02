import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { deleteManagedUser, normalizeManagedUserUpdateInput, updateManagedUser } from "@/server/builder/users"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceMutationReceipt, finalizeMutationReceipt, parseMutationEnvelope } from "@/server/http/route-policy"

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
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, normalizeManagedUserUpdateInput)

    const receipt = await enforceMutationReceipt({
      scope: "users.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const user = await withMutationTelemetry(
      access,
      {
        message: "User governance updated",
        action: "users.update",
        route: "/api/builder/users/[id]",
        entityType: "user",
        entityId: id,
      },
      () => updateManagedUser(access.user, id, input),
    )

    const responseBody = { user }
    await finalizeMutationReceipt({
      scope: "users.update",
      access,
      mutation,
      responseStatus: 200,
      responseBody,
    })
    return routeJson(access, responseBody)
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
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value)

    const receipt = await enforceMutationReceipt({
      scope: "users.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

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

    const responseBody = { success: true as const }
    await finalizeMutationReceipt({
      scope: "users.delete",
      access,
      mutation,
      responseStatus: 200,
      responseBody,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}
