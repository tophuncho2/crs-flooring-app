import { revokeInviteUseCase } from "@builders/application"
import { getInviteRecordById } from "@builders/db"
import { USER_MANAGEMENT_MIN_RANK } from "@builders/domain"
import { createAppError, parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"

export const GET = createQueryRoute({
  route: "/api/invites/[id]",
  minRank: USER_MANAGEMENT_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: () => ({}),
  useCase: async ({ params }) => {
    const invite = await getInviteRecordById(params.id)
    if (!invite) {
      throw createAppError("Invite not found", { status: 404 })
    }
    return invite
  },
  buildResponseBody: ({ result }) => ({ invite: result }),
})

export const DELETE = createMutationRoute({
  scope: "invites.delete",
  route: "/api/invites/[id]",
  rateLimit: CRUD_DELETE,
  minRank: USER_MANAGEMENT_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: (value) => value,
  useCase: ({ params, access }) =>
    revokeInviteUseCase(params.id, { email: access.user.email, rank: access.user.rank }),
  telemetry: ({ params }) => ({
    action: "invites.delete",
    message: "Invite revoked",
    entityType: "userInvite",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: () => ({ ok: true as const }),
})
