import { deleteEntityUseCase } from "@builders/application"
import { getEntityById } from "@builders/db"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"

export const GET = createQueryRoute({
  route: "/api/entities/[id]",
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: () => ({}),
  useCase: async ({ params }) => getEntityById(params.id),
  buildResponseBody: ({ result }) => ({ entity: result }),
})

export const DELETE = createMutationRoute({
  scope: "entities.delete",
  route: "/api/entities/[id]",
  rateLimit: CRUD_DELETE,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: (value) => value,
  concurrency: {
    loadSnapshot: ({ params }) => getEntityById(params.id, { withNeighbors: false }),
    snapshotKey: "entity",
    message: "Entity changed before delete completed. Refresh and try again.",
  },
  useCase: ({ params }) => deleteEntityUseCase(params.id),
  telemetry: ({ params }) => ({
    action: "entities.delete",
    message: "Entity deleted",
    entityType: "entity",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: () => ({ ok: true as const }),
})
