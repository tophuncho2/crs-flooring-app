import { saveTemplateProductsSectionUseCase } from "@builders/application"
import { getTemplateById } from "@builders/db"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateTemplateProductsSectionInput } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "templates.products.section.replace",
  route: "/api/templates/[id]/products/section",
  rateLimit: CRUD_UPDATE_SECTION,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateTemplateProductsSectionInput,
  concurrency: {
    loadSnapshot: ({ params }) => getTemplateById(params.id, { withNeighbors: false }),
    snapshotKey: "template",
    message: "Template changed before products save completed. Refresh and try again.",
  },
  useCase: ({ input, access, params }) =>
    saveTemplateProductsSectionUseCase(
      {
        templateId: params.id,
        plannedProducts: input.plannedProducts,
        serviceItems: input.serviceItems,
        commissions: input.commissions,
      },
      access.user.email,
    ),
  telemetry: ({ params }) => ({
    action: "templates.products.section.replace",
    message: "Template products section replaced",
    entityType: "template",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: async ({ result, params }) => ({
    template: await getTemplateById(params.id),
    tempIdMap: result.tempIdMap,
  }),
})
