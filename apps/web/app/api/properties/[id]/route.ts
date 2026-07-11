import { deletePropertyUseCase } from "@builders/application"
import { getPropertyById } from "@builders/db"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"

export const GET = createQueryRoute({
  route: "/api/properties/[id]",
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: () => ({}),
  useCase: async ({ params }) => getPropertyById(params.id),
  buildResponseBody: ({ result }) => ({ property: result }),
})

export const DELETE = createMutationRoute({
  scope: "properties.delete",
  route: "/api/properties/[id]",
  rateLimit: CRUD_DELETE,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: (value) => value,
  concurrency: {
    loadSnapshot: ({ params }) => getPropertyById(params.id, { withNeighbors: false }),
    snapshotKey: "property",
    message: "Property changed before delete completed. Refresh and try again.",
  },
  useCase: ({ params }) => deletePropertyUseCase(params.id),
  telemetry: ({ params }) => ({
    action: "properties.delete",
    message: "Property deleted",
    entityType: "flooringProperty",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: () => ({ ok: true as const }),
})
