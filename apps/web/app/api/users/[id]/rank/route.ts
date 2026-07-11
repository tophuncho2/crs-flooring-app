import { updateUserRankUseCase } from "@builders/application"
import { USER_MANAGEMENT_MIN_RANK } from "@builders/domain"
import { parseRequiredString } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateUpdateUserRankInput } from "../../_validators"

export const PATCH = createMutationRoute({
  scope: "users.rank.update",
  route: "/api/users/[id]/rank",
  rateLimit: CRUD_UPDATE_SECTION,
  minRank: USER_MANAGEMENT_MIN_RANK,
  // OCC is enforced inside the use case via `expectedUpdatedAt`, not a route
  // snapshot assert — so require it here and thread it through.
  requireExpectedUpdatedAt: true,
  // User ids are opaque auth identifiers (Better Auth), not UUIDs.
  parseParams: async (raw) => ({ id: parseRequiredString((raw as { id: string }).id, "id") }),
  parseInput: validateUpdateUserRankInput,
  useCase: ({ input, access, params, mutation }) =>
    updateUserRankUseCase(
      { id: params.id, rank: input.rank, expectedUpdatedAt: mutation.expectedUpdatedAt! },
      { id: access.user.id, email: access.user.email, rank: access.user.rank },
    ),
  telemetry: ({ params }) => ({
    action: "users.rank.update",
    message: "User rank changed",
    entityType: "user",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: ({ result }) => ({ user: result }),
})
