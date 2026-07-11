import { deleteEntityTypeUseCase, EntityTypeExecutionError } from "@builders/application"
import { getEntityTypeById, getEntityTypeDetailById } from "@builders/db"
import { ELEVATED_MODULE_MIN_RANK, ENTITY_TYPE_NOT_FOUND_MESSAGE } from "@builders/domain"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"

export const GET = createQueryRoute({
  route: "/api/entity-types/[id]",
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: () => ({}),
  useCase: async ({ params }) => {
    const entityType = await getEntityTypeDetailById(params.id, { withNeighbors: true })
    if (!entityType) {
      throw new EntityTypeExecutionError({
        code: "ENTITY_TYPE_NOT_FOUND",
        message: ENTITY_TYPE_NOT_FOUND_MESSAGE,
        status: 404,
      })
    }
    return entityType
  },
  buildResponseBody: ({ result }) => ({ entityType: result }),
})

export const DELETE = createMutationRoute({
  scope: "entityTypes.delete",
  route: "/api/entity-types/[id]",
  rateLimit: CRUD_DELETE,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: (value) => value,
  concurrency: {
    loadSnapshot: ({ params }) => getEntityTypeById(params.id),
    snapshotKey: "entityType",
    message: "Entity type changed before delete completed. Refresh and try again.",
  },
  useCase: ({ params }) => deleteEntityTypeUseCase(params.id),
  telemetry: ({ params }) => ({
    action: "entityTypes.delete",
    message: "Entity type deleted",
    entityType: "flooringEntityType",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: () => ({ ok: true as const }),
})
