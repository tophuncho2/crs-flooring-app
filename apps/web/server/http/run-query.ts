import type { UserRank } from "@builders/db"
import type { AuthorizedRouteContext } from "@/server/auth/route-auth"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

/**
 * Shared query-route gauntlet: `applyRoutePolicy` (auth + optional minRank) →
 * `enforceQueryRateLimit` → parse params → parse query → use case → `routeJson`,
 * with a single `catch → routeError`. Collapses the ~identical body every read
 * handler (list / options / search / detail) hand-rolls.
 *
 * `createQueryRoute(options)` RETURNS the Next route handler, so a route file is
 * just `export const GET = createQueryRoute({ ... })`. Everything that shapes the
 * response — the route string, rank, validators, use case, body — is a verbatim
 * per-call value, never derived, so runtime behavior is byte-identical to the
 * hand-rolled handler it replaces.
 *
 * Detail reads fit too: give `parseParams` the id parse and let `useCase` do the
 * repo read and throw the module's own `*ExecutionError` not-found — `routeError`
 * normalizes it exactly as the inline throw did.
 */
export type RunQueryOptions<TParams, TInput, TResult> = {
  /** Route label for the rate-limit bucket (e.g. "/api/job-types/[id]"). */
  route: string
  /** Optional minimum rank; folded into `applyRoutePolicy` (before rate-limit). */
  minRank?: UserRank
  /** Parse route params (e.g. `parseUuidParam`). Omit for param-less routes. */
  parseParams?: (raw: unknown, ctx: { access: AuthorizedRouteContext }) => Promise<TParams> | TParams
  /** Parse + validate the query string into the use-case input. */
  parseInput: (searchParams: URLSearchParams, params: TParams) => TInput
  /** The single read use case (or repo read + not-found throw for detail). */
  useCase: (ctx: { input: TInput; access: AuthorizedRouteContext; params: TParams }) => Promise<TResult>
  /** Shape the response body. Defaults to the use-case result unchanged. */
  buildResponseBody?: (ctx: { result: TResult; params: TParams; access: AuthorizedRouteContext }) => unknown
}

export function createQueryRoute<TParams, TInput, TResult>(
  options: RunQueryOptions<TParams, TInput, TResult>,
) {
  return async function handler(
    request: Request,
    routeCtx?: { params: Promise<unknown> },
  ): Promise<Response> {
    const access = await applyRoutePolicy(request, { minRank: options.minRank })
    if (access instanceof Response) return access

    const rateLimited = await enforceQueryRateLimit(request, access, options.route)
    if (rateLimited) return rateLimited

    try {
      const params = options.parseParams
        ? await options.parseParams(routeCtx ? await routeCtx.params : undefined, { access })
        : ({} as TParams)
      const url = new URL(request.url)
      const input = options.parseInput(url.searchParams, params)
      const result = await options.useCase({ input, access, params })
      const body = options.buildResponseBody
        ? options.buildResponseBody({ result, params, access })
        : result
      return routeJson(access, body)
    } catch (error) {
      return routeError(access, error)
    }
  }
}
