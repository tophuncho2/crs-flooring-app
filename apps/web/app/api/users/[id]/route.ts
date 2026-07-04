import { UserExecutionError, deleteUserUseCase } from "@builders/application"
import { getUserRecordById } from "@builders/db"
import { enforceManageUsersAccess } from "@/server/auth/route-auth"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseRequiredString } from "@/server/http/api-helpers"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const forbidden = enforceManageUsersAccess(access)
  if (forbidden) return forbidden

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/users/[id]")
  if (rateLimited) return rateLimited

  try {
    const { id: rawId } = await params
    // User ids are opaque auth identifiers (Better Auth), not UUIDs.
    const id = parseRequiredString(rawId, "id")
    const user = await getUserRecordById(id)
    if (!user) {
      throw new UserExecutionError({
        code: "USER_NOT_FOUND",
        message: "User not found",
        status: 404,
      })
    }
    return routeJson(access, { user })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_DELETE,
      scope: "users.delete",
      route: "/api/users/[id]",
    },
  })
  if (access instanceof Response) return access

  const forbidden = enforceManageUsersAccess(access)
  if (forbidden) return forbidden

  try {
    const { id: rawId } = await params
    // User ids are opaque auth identifiers (Better Auth), not UUIDs.
    const id = parseRequiredString(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    // No payload beyond the mutation envelope; delete is guarded by
    // `expectedUpdatedAt` (optimistic concurrency enforced in the use case).
    const { mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })

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
        route: "/api/users/[id]",
        entityType: "user",
        entityId: id,
      },
      () =>
        deleteUserUseCase(
          { id, expectedUpdatedAt: mutation.expectedUpdatedAt! },
          { id: access.user.id, email: access.user.email, rank: access.user.rank },
        ),
    )

    const responseBody = { ok: true as const }
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
