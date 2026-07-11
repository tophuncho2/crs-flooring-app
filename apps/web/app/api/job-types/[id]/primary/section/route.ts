import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { updateJobTypeUseCase } from "@builders/application"
import { getJobTypeById } from "@builders/db"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateUpdateJobTypeInput } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "jobTypes.primary.section.replace",
  route: "/api/job-types/[id]/primary/section",
  rateLimit: CRUD_UPDATE_SECTION,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateUpdateJobTypeInput,
  concurrency: {
    loadSnapshot: ({ params }) => getJobTypeById(params.id),
    snapshotKey: "jobType",
    message: "Job type changed before section save completed. Refresh and try again.",
  },
  useCase: ({ input, access, params }) => updateJobTypeUseCase(params.id, input, access.user.email),
  telemetry: ({ params }) => ({
    action: "jobTypes.primary.section.replace",
    message: "Job type primary section replaced",
    entityType: "flooringJobType",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: ({ result }) => ({ jobType: result }),
})
