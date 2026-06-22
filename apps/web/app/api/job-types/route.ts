import {
  createJobTypeUseCase,
  listJobTypesUseCase,
} from "@builders/application"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import {
  validateCreateJobTypeInput,
  validateListJobTypesQuery,
} from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/job-types")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateListJobTypesQuery(url.searchParams)
    const result = await listJobTypesUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_CREATE,
      scope: "jobTypes.create",
      route: "/api/job-types",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreateJobTypeInput)

    const receipt = await enforceMutationReceipt({
      scope: "jobTypes.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Job type created",
        action: "jobTypes.create",
        route: "/api/job-types",
        entityType: "flooringJobType",
      },
      () => createJobTypeUseCase(input, access.user.email),
    )

    const responseBody = { jobType: result }
    await finalizeMutationReceipt({
      scope: "jobTypes.create",
      access,
      mutation,
      responseStatus: 201,
      responseBody,
    })
    return routeJson(access, responseBody, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
