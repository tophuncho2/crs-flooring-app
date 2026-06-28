import { createInviteUseCase, listInvitesUseCase } from "@builders/application"
import { enforceManageUsersAccess } from "@/server/auth/route-auth"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateCreateInviteInput, validateListInvitesQuery } from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const forbidden = enforceManageUsersAccess(access)
  if (forbidden) return forbidden

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/invites")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateListInvitesQuery(url.searchParams)
    const result = await listInvitesUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_CREATE,
      scope: "invites.create",
      route: "/api/invites",
    },
  })
  if (access instanceof Response) return access

  const forbidden = enforceManageUsersAccess(access)
  if (forbidden) return forbidden

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreateInviteInput)

    const receipt = await enforceMutationReceipt({
      scope: "invites.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Invite created",
        action: "invites.create",
        route: "/api/invites",
        entityType: "userInvite",
      },
      () => createInviteUseCase(input, { email: access.user.email, rank: access.user.rank }),
    )

    const responseBody = { invite: result }
    await finalizeMutationReceipt({
      scope: "invites.create",
      access,
      mutation,
      responseStatus: 201,
      responseBody,
    })
    return routeJson(access, responseBody, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
