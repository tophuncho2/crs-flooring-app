import { listInventoryMergeCandidatesUseCase } from "@builders/application"
import {
  applyRoutePolicy,
  enforceQueryRateLimit,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateMergeCandidatesQuery } from "../_validators"

/**
 * GET /api/inventory/merge-candidates — the product-scoped candidate list behind
 * the inventory merge picker. Excludes archived, already-merged, and zero-balance
 * rows (a zero-balance row contributes nothing and must not be merged). Read-only
 * — no mutation gauntlet; the merge itself goes through POST /api/inventory/merge,
 * which re-asserts the same eligibility under lock.
 */
export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/inventory/merge-candidates",
  )
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateMergeCandidatesQuery(url.searchParams)
    const result = await listInventoryMergeCandidatesUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}
