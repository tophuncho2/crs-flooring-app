import { UserExecutionError, deleteUserUseCase } from "@builders/application"
import { getUserRecordById } from "@builders/db"
import { USER_MANAGEMENT_MIN_RANK } from "@builders/domain"
import { parseRequiredString } from "@/server/http/api-helpers"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"

export const GET = createQueryRoute({
  route: "/api/users/[id]",
  minRank: USER_MANAGEMENT_MIN_RANK,
  // User ids are opaque auth identifiers (Better Auth), not UUIDs.
  parseParams: async (raw) => ({ id: parseRequiredString((raw as { id: string }).id, "id") }),
  parseInput: () => ({}),
  useCase: async ({ params }) => {
    const user = await getUserRecordById(params.id)
    if (!user) {
      throw new UserExecutionError({
        code: "USER_NOT_FOUND",
        message: "User not found",
        status: 404,
      })
    }
    return user
  },
  buildResponseBody: ({ result }) => ({ user: result }),
})

export const DELETE = createMutationRoute({
  scope: "users.delete",
  route: "/api/users/[id]",
  rateLimit: CRUD_DELETE,
  minRank: USER_MANAGEMENT_MIN_RANK,
  // OCC is enforced inside the use case via `expectedUpdatedAt`, not a route
  // snapshot assert — so require it here and thread it through.
  requireExpectedUpdatedAt: true,
  // User ids are opaque auth identifiers (Better Auth), not UUIDs.
  parseParams: async (raw) => ({ id: parseRequiredString((raw as { id: string }).id, "id") }),
  parseInput: (value) => value,
  useCase: ({ access, params, mutation }) =>
    deleteUserUseCase(
      { id: params.id, expectedUpdatedAt: mutation.expectedUpdatedAt! },
      { id: access.user.id, email: access.user.email, rank: access.user.rank },
    ),
  telemetry: ({ params }) => ({
    action: "users.delete",
    message: "User deleted",
    entityType: "user",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: () => ({ ok: true as const }),
})
