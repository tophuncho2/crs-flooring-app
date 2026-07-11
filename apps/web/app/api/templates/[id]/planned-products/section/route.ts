import { saveTemplatePlannedProductsSectionUseCase } from "@builders/application"
import { getTemplateById } from "@builders/db"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateTemplatePlannedProductsDiffInput } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "templates.planned-products.section.replace",
  route: "/api/templates/[id]/planned-products/section",
  rateLimit: CRUD_UPDATE_SECTION,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateTemplatePlannedProductsDiffInput,
  concurrency: {
    loadSnapshot: ({ params }) => getTemplateById(params.id, { withNeighbors: false }),
    snapshotKey: "template",
    message: "Template changed before planned products save completed. Refresh and try again.",
  },
  useCase: ({ input, access, params }) =>
    saveTemplatePlannedProductsSectionUseCase({ templateId: params.id, diff: input }, access.user.email),
  telemetry: ({ params }) => ({
    action: "templates.planned-products.section.replace",
    message: "Template planned products section replaced",
    entityType: "template",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: async ({ result, params }) => ({
    template: await getTemplateById(params.id),
    tempIdMap: result.tempIdMap,
  }),
})
