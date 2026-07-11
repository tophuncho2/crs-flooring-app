import { updateTemplateUseCase } from "@builders/application"
import { getTemplateById } from "@builders/db"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateUpdateTemplateInput } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "templates.primary.section.replace",
  route: "/api/templates/[id]/primary/section",
  rateLimit: CRUD_UPDATE_SECTION,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateUpdateTemplateInput,
  concurrency: {
    loadSnapshot: ({ params }) => getTemplateById(params.id, { withNeighbors: false }),
    snapshotKey: "template",
    message: "Template changed before section save completed. Refresh and try again.",
  },
  useCase: ({ input, access, params }) => updateTemplateUseCase(params.id, input, access.user.email),
  telemetry: ({ params }) => ({
    action: "templates.primary.section.replace",
    message: "Template primary section replaced",
    entityType: "template",
    entityId: params.id,
  }),
  status: 200,
  // Re-read with neighbors so the response carries the stepper's prev/next
  // (mirrors the planned-products section route); the use-case return omits them.
  buildResponseBody: async ({ params }) => ({ template: await getTemplateById(params.id) }),
})
