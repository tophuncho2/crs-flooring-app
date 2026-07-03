import { revokeInviteUseCase } from "@builders/application"
import { getInviteRecordById } from "@builders/db"
import { enforceManageUsersAccess } from "@/server/auth/route-auth"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { createAppError, parseUuidParam } from "@/server/http/api-helpers"
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

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/invites/[id]")
  if (rateLimited) return rateLimited

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const invite = await getInviteRecordById(id)
    if (!invite) {
      throw createAppError("Invite not found", { status: 404 })
    }
    return routeJson(access, { invite })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_DELETE,
      scope: "invites.delete",
      route: "/api/invites/[id]",
    },
  })
  if (access instanceof Response) return access

  const forbidden = enforceManageUsersAccess(access)
  if (forbidden) return forbidden

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { mutation } = parseMutationEnvelope(body, (value) => value)

    const receipt = await enforceMutationReceipt({
      scope: "invites.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    await withMutationTelemetry(
      access,
      {
        message: "Invite revoked",
        action: "invites.delete",
        route: "/api/invites/[id]",
        entityType: "userInvite",
        entityId: id,
      },
      () => revokeInviteUseCase(id, { email: access.user.email, rank: access.user.rank }),
    )

    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "invites.delete",
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
