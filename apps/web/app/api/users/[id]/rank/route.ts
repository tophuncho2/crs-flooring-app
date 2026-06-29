import { updateUserRankUseCase } from "@builders/application"
import { enforceManageUsersAccess } from "@/server/auth/route-auth"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseRequiredString } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateUpdateUserRankInput } from "../../_validators"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_UPDATE_SECTION,
      scope: "users.rank.update",
      route: "/api/users/[id]/rank",
    },
  })
  if (access instanceof Response) return access

  const forbidden = enforceManageUsersAccess(access)
  if (forbidden) return forbidden

  try {
    const { id: rawId } = await params
    // User ids are opaque auth identifiers (Better Auth), not UUIDs — require
    // non-empty, not UUID-shaped.
    const id = parseRequiredString(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateUserRankInput, {
      requireExpectedUpdatedAt: true,
    })

    const receipt = await enforceMutationReceipt({
      scope: "users.rank.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "User rank changed",
        action: "users.rank.update",
        route: "/api/users/[id]/rank",
        entityType: "user",
        entityId: id,
      },
      () =>
        updateUserRankUseCase(
          { id, rank: input.rank, expectedUpdatedAt: mutation.expectedUpdatedAt! },
          { id: access.user.id, email: access.user.email, rank: access.user.rank },
        ),
    )

    const responseBody = { user: result }
    await finalizeMutationReceipt({
      scope: "users.rank.update",
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
