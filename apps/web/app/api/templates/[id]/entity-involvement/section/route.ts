import { saveTemplateEntityInvolvementSectionUseCase } from "@builders/application"
import { getTemplateById } from "@builders/db"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateTemplateEntityInvolvementsDiffInput } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "templates.entity-involvement.section.replace",
  route: "/api/templates/[id]/entity-involvement/section",
  rateLimit: CRUD_UPDATE_SECTION,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateTemplateEntityInvolvementsDiffInput,
  concurrency: {
    loadSnapshot: ({ params }) => getTemplateById(params.id, { withNeighbors: false }),
    snapshotKey: "template",
    message: "Template changed before entity involvement save completed. Refresh and try again.",
  },
  useCase: ({ input, access, params }) =>
    saveTemplateEntityInvolvementSectionUseCase({ templateId: params.id, diff: input }, access.user.email),
  telemetry: ({ params }) => ({
    action: "templates.entity-involvement.section.replace",
    message: "Template entity involvement section replaced",
    entityType: "template",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: async ({ result, params }) => ({
    template: await getTemplateById(params.id),
    tempIdMap: result.tempIdMap,
  }),
})
