import type { UserRank } from "@builders/db"
import type { AuthorizedRouteContext } from "@/server/auth/route-auth"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
  type MutationMeta,
} from "@/server/http/route-policy"

/**
 * Shared mutation gauntlet: `applyRoutePolicy` (auth + minRank + rate-limit) →
 * `parseMutationEnvelope` → [optional OCC snapshot + `assertExpectedUpdatedAt`] →
 * `enforceMutationReceipt` (+ replay short-circuit) → `withMutationTelemetry`
 * (use case) → `buildResponseBody` → `finalizeMutationReceipt` → `routeJson`,
 * with a single `catch → routeError`. Collapses the 9-step gauntlet every
 * POST/PATCH/DELETE hand-rolls.
 *
 * `createMutationRoute(options)` RETURNS the Next route handler. Every value that
 * feeds the idempotency request-hash, the telemetry record, the response status,
 * or the response body is a verbatim per-call value or a pure function of
 * `params`/`result` — NEVER derived — so runtime behavior (and thus receipt
 * replay compatibility) is byte-identical to the hand-rolled handler.
 *
 * OCC (PATCH/DELETE) rides the `concurrency` block: it loads the snapshot and
 * asserts `expectedUpdatedAt` BEFORE the receipt is reserved (the assert-before-
 * reserve invariant), and `requireExpectedUpdatedAt` is forced true.
 *
 * Non-JSON mutations (multipart uploads) cannot use `parseMutationEnvelope` and
 * stay hand-rolled on the raw receipt primitives — this wrapper is JSON-only.
 */
type RateLimitPreset = { limit: number; windowMs: number }

type MutationTelemetryMeta = {
  action: string
  message: string
  entityType?: string
  entityId?: string
  failureAction?: string
  failureMessage?: string
  details?: Record<string, unknown>
}

type MutationCtx<TParams> = {
  access: AuthorizedRouteContext
  params: TParams
  request: Request
}

export type RunMutationOptions<TParams, TInput, TResult> = {
  /** Idempotency scope + rate-limit + telemetry-fallback key. Passed VERBATIM. */
  scope: string
  /** Route label for rate-limit + telemetry `route`. */
  route: string
  /** Rate-limit bucket (a preset like `CRUD_CREATE`, or an inline `{limit,windowMs}`). */
  rateLimit: RateLimitPreset
  /** Optional rate-limit identifier override (defaults to the caller's user id). */
  rateLimitIdentifier?: string | ((access: AuthorizedRouteContext) => string)
  /** Optional minimum rank; folded into `applyRoutePolicy` (before rate-limit). */
  minRank?: UserRank
  /** Parse route params (e.g. `parseUuidParam`). Omit for param-less POSTs. */
  parseParams?: (raw: unknown, ctx: { access: AuthorizedRouteContext }) => Promise<TParams> | TParams
  /** Parse + validate the JSON body (sans envelope) into the use-case input. */
  parseInput: (inputBody: Record<string, unknown>) => TInput
  /** Force `expectedUpdatedAt` even without a `concurrency` block. */
  requireExpectedUpdatedAt?: boolean
  /** Optimistic-concurrency preflight (PATCH/DELETE): assert-before-reserve. */
  concurrency?: {
    loadSnapshot: (ctx: MutationCtx<TParams>) => Promise<{ updatedAt: string | Date } & Record<string, unknown>>
    snapshotKey: string
    message?: string
  }
  /**
   * The single use case. `mutation` (idempotencyKey + expectedUpdatedAt) is
   * exposed for the handful of use cases that enforce OCC themselves by taking
   * `expectedUpdatedAt` as an argument (rather than a route-level snapshot
   * assert) — e.g. the user rank/delete use cases.
   */
  useCase: (ctx: {
    input: TInput
    access: AuthorizedRouteContext
    params: TParams
    request: Request
    mutation: MutationMeta
  }) => Promise<TResult>
  /** Telemetry meta (verbatim object, or a pure function of params/access). */
  telemetry:
    | MutationTelemetryMeta
    | ((ctx: { params: TParams; access: AuthorizedRouteContext }) => MutationTelemetryMeta)
  /** Response status (e.g. 201 create, 200 section/delete, 202 accepted). */
  status: number
  /** Shape the response body (may be async, e.g. to re-fetch a parent aggregate). */
  buildResponseBody: (ctx: {
    result: TResult
    params: TParams
    access: AuthorizedRouteContext
  }) => Record<string, unknown> | Promise<Record<string, unknown>>
}

export function createMutationRoute<TParams, TInput, TResult>(
  options: RunMutationOptions<TParams, TInput, TResult>,
) {
  return async function handler(
    request: Request,
    routeCtx?: { params: Promise<unknown> },
  ): Promise<Response> {
    const access = await applyRoutePolicy(request, {
      minRank: options.minRank,
      rateLimit: {
        limit: options.rateLimit.limit,
        windowMs: options.rateLimit.windowMs,
        scope: options.scope,
        route: options.route,
        identifier: options.rateLimitIdentifier,
      },
    })
    if (access instanceof Response) return access

    try {
      const params = options.parseParams
        ? await options.parseParams(routeCtx ? await routeCtx.params : undefined, { access })
        : ({} as TParams)

      const body = (await request.json()) as Record<string, unknown>
      const { input, mutation } = parseMutationEnvelope(body, options.parseInput, {
        requireExpectedUpdatedAt: options.concurrency ? true : options.requireExpectedUpdatedAt,
      })

      // OCC preflight — assert BEFORE reserving the receipt.
      if (options.concurrency) {
        const snapshot = await options.concurrency.loadSnapshot({ access, params, request })
        assertExpectedUpdatedAt({
          actualUpdatedAt: snapshot.updatedAt,
          expectedUpdatedAt: mutation.expectedUpdatedAt,
          snapshot: { [options.concurrency.snapshotKey]: snapshot },
          message: options.concurrency.message,
        })
      }

      const receipt = await enforceMutationReceipt({
        scope: options.scope,
        request,
        access,
        mutation,
        body,
      })
      if (receipt.replay) return receipt.replay

      const meta =
        typeof options.telemetry === "function" ? options.telemetry({ params, access }) : options.telemetry
      const result = await withMutationTelemetry(
        access,
        { route: options.route, ...meta },
        () => options.useCase({ input, access, params, request, mutation }),
      )

      const responseBody = await options.buildResponseBody({ result, params, access })
      await finalizeMutationReceipt({
        scope: options.scope,
        access,
        mutation,
        responseStatus: options.status,
        responseBody,
      })
      return routeJson(access, responseBody, { status: options.status })
    } catch (error) {
      return routeError(access, error)
    }
  }
}
