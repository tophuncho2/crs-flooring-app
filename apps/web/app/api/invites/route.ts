import { createInviteUseCase, listInvitesUseCase } from "@builders/application"
import { USER_MANAGEMENT_MIN_RANK } from "@builders/domain"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"
import { validateCreateInviteInput, validateListInvitesQuery } from "./_validators"

export const GET = createQueryRoute({
  route: "/api/invites",
  minRank: USER_MANAGEMENT_MIN_RANK,
  parseInput: (searchParams) => validateListInvitesQuery(searchParams),
  useCase: ({ input }) => listInvitesUseCase(input),
})

export const POST = createMutationRoute({
  scope: "invites.create",
  route: "/api/invites",
  rateLimit: CRUD_CREATE,
  minRank: USER_MANAGEMENT_MIN_RANK,
  parseInput: validateCreateInviteInput,
  useCase: ({ input, access }) =>
    createInviteUseCase(input, { email: access.user.email, rank: access.user.rank }),
  telemetry: {
    action: "invites.create",
    message: "Invite created",
    entityType: "userInvite",
  },
  status: 201,
  buildResponseBody: ({ result }) => ({ invite: result }),
})
