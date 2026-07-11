import { deleteTemplateUseCase } from "@builders/application"
import { getTemplateById } from "@builders/db"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"

export const GET = createQueryRoute({
  route: "/api/templates/[id]",
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: () => ({}),
  useCase: async ({ params }) => getTemplateById(params.id),
  buildResponseBody: ({ result }) => ({ template: result }),
})

export const DELETE = createMutationRoute({
  scope: "templates.delete",
  route: "/api/templates/[id]",
  rateLimit: CRUD_DELETE,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: (value) => value,
  concurrency: {
    loadSnapshot: ({ params }) => getTemplateById(params.id, { withNeighbors: false }),
    snapshotKey: "template",
    message: "Template changed before delete completed. Refresh and try again.",
  },
  useCase: ({ params }) => deleteTemplateUseCase(params.id),
  telemetry: ({ params }) => ({
    action: "templates.delete",
    message: "Template deleted",
    entityType: "template",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: () => ({ ok: true as const }),
})
