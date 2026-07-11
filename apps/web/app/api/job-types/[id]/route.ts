import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { deleteJobTypeUseCase, JobTypeExecutionError } from "@builders/application"
import { getJobTypeById, getJobTypeDetailById } from "@builders/db"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"

export const GET = createQueryRoute({
  route: "/api/job-types/[id]",
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: () => ({}),
  useCase: async ({ params }) => {
    const jobType = await getJobTypeDetailById(params.id, { withNeighbors: true })
    if (!jobType) {
      throw new JobTypeExecutionError({
        code: "JOB_TYPE_NOT_FOUND",
        message: "Job type not found",
        status: 404,
      })
    }
    return jobType
  },
  buildResponseBody: ({ result }) => ({ jobType: result }),
})

export const DELETE = createMutationRoute({
  scope: "jobTypes.delete",
  route: "/api/job-types/[id]",
  rateLimit: CRUD_DELETE,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: (value) => value,
  concurrency: {
    loadSnapshot: ({ params }) => getJobTypeById(params.id),
    snapshotKey: "jobType",
    message: "Job type changed before delete completed. Refresh and try again.",
  },
  useCase: ({ params }) => deleteJobTypeUseCase(params.id),
  telemetry: ({ params }) => ({
    action: "jobTypes.delete",
    message: "Job type deleted",
    entityType: "flooringJobType",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: () => ({ ok: true as const }),
})
