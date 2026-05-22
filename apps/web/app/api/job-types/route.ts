import {
  createJobTypeUseCase,
  listJobTypesUseCase,
} from "@builders/application"
import { JOB_TYPES_TOOL_SLUG } from "@/modules/shared/access/lookup-domains"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
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
  const access = await applyRoutePolicy(request, {
    toolSlug: JOB_TYPES_TOOL_SLUG,
  })
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
    capability: "system.access",
    toolSlug: JOB_TYPES_TOOL_SLUG,
    rateLimit: {
      scope: "jobTypes.create",
      limit: 20,
      windowMs: 10 * 60 * 1000,
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
      () => createJobTypeUseCase(input),
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
