import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { updateJobTypeUseCase } from "@builders/application"
import { getJobTypeById } from "@builders/db"
import { enforceRankAtLeast } from "@/server/auth/route-auth"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateUpdateJobTypeInput } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_UPDATE_SECTION,
      scope: "jobTypes.primary.section.replace",
      route: "/api/job-types/[id]/primary/section",
    },
  })
  if (access instanceof Response) return access

  const forbidden = enforceRankAtLeast(access, ELEVATED_MODULE_MIN_RANK)
  if (forbidden) return forbidden

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateJobTypeInput, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getJobTypeById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { jobType: currentSnapshot },
      message:
        "Job type changed before section save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "jobTypes.primary.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Job type primary section replaced",
        action: "jobTypes.primary.section.replace",
        route: "/api/job-types/[id]/primary/section",
        entityType: "flooringJobType",
        entityId: id,
      },
      () => updateJobTypeUseCase(id, input, access.user.email),
    )

    const responseBody = { jobType: result }
    await finalizeMutationReceipt({
      scope: "jobTypes.primary.section.replace",
      access,
      mutation,
      responseStatus: 200,
      responseBody,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}
