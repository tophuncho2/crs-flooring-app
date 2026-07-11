import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import {
  createJobTypeUseCase,
  listJobTypesUseCase,
} from "@builders/application"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"
import {
  validateCreateJobTypeInput,
  validateListJobTypesQuery,
} from "./_validators"

export const GET = createQueryRoute({
  route: "/api/job-types",
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseInput: (searchParams) => validateListJobTypesQuery(searchParams),
  useCase: ({ input }) => listJobTypesUseCase(input),
})

export const POST = createMutationRoute({
  scope: "jobTypes.create",
  route: "/api/job-types",
  rateLimit: CRUD_CREATE,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseInput: validateCreateJobTypeInput,
  useCase: ({ input, access }) => createJobTypeUseCase(input, access.user.email),
  telemetry: { action: "jobTypes.create", message: "Job type created", entityType: "flooringJobType" },
  status: 201,
  buildResponseBody: ({ result }) => ({ jobType: result }),
})
