import { createHash } from "node:crypto"
import { Prisma, getAppMutationReceipt, reserveAppMutationReceipt, finalizeAppMutationReceipt } from "@builders/db"
import type { Capability } from "@/server/auth/access-control"
import type { AuthorizedRouteContext } from "@/server/auth/route-auth"
import { enforceRouteRateLimit, requireRouteAccess } from "@/server/http/route-helpers"
import { createAppError, parseRequiredString } from "@/server/http/api-helpers"
import { jsonWithRequestId } from "@/server/platform/request-context"
import type { ToolSlug } from "@/server/platform/tool-subscriptions"

export type MutationMeta = {
  idempotencyKey: string
  expectedUpdatedAt?: string
}

export type MutationRequest<T> = T & {
  mutation: MutationMeta
}

export type RoutePolicy = {
  capability?: Capability
  toolSlug?: ToolSlug
  allowUnverified?: boolean
  rateLimit?: {
    scope: string
    limit: number
    windowMs: number
    route: string
    identifier?: string | ((context: AuthorizedRouteContext) => string)
  }
}

type ParseMutationEnvelopeOptions = {
  requireExpectedUpdatedAt?: boolean
}

type MutationReceiptContext = {
  scope: string
  request: Request
  access: AuthorizedRouteContext
  mutation: MutationMeta
  body: Record<string, unknown>
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableNormalize)
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([_, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))

    return Object.fromEntries(entries.map(([key, entryValue]) => [key, stableNormalize(entryValue)]))
  }

  return value
}

function buildMutationRequestHash(input: {
  method: string
  scope: string
  body: Record<string, unknown>
}) {
  const normalizedBody = { ...input.body }
  if (normalizedBody.mutation && typeof normalizedBody.mutation === "object" && !Array.isArray(normalizedBody.mutation)) {
    const mutation = { ...(normalizedBody.mutation as Record<string, unknown>) }
    delete mutation.idempotencyKey
    normalizedBody.mutation = mutation
  }

  return createHash("sha256")
    .update(
      JSON.stringify(
        stableNormalize({
          method: input.method.toUpperCase(),
          scope: input.scope,
          body: normalizedBody,
        }),
      ),
    )
    .digest("hex")
}

export async function enforceQueryRateLimit(
  request: Request,
  access: AuthorizedRouteContext,
  route: string,
): Promise<Response | null> {
  return enforceRouteRateLimit(request, access, {
    scope: "query",
    limit: 100,
    windowMs: 60 * 1000,
    route,
  })
}

export async function applyRoutePolicy(
  request: Request,
  policy: RoutePolicy = {},
): Promise<AuthorizedRouteContext | Response> {
  const access = await requireRouteAccess(request, {
    capability: policy.capability,
    toolSlug: policy.toolSlug,
    allowUnverified: policy.allowUnverified,
  })

  if (access instanceof Response) {
    return access
  }

  if (!policy.rateLimit) {
    return access
  }

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: policy.rateLimit.scope,
    limit: policy.rateLimit.limit,
    windowMs: policy.rateLimit.windowMs,
    route: policy.rateLimit.route,
    identifier:
      typeof policy.rateLimit.identifier === "function"
        ? policy.rateLimit.identifier(access)
        : policy.rateLimit.identifier,
  })

  if (rateLimitResponse) {
    return rateLimitResponse
  }

  return access
}

export function parseMutationEnvelope<TInput>(
  body: Record<string, unknown>,
  parseInput: (inputBody: Record<string, unknown>) => TInput,
  options: ParseMutationEnvelopeOptions = {},
) {
  const mutationBody = body.mutation
  if (!mutationBody || typeof mutationBody !== "object" || Array.isArray(mutationBody)) {
    throw createAppError("mutation is required", { field: "mutation" })
  }

  const idempotencyKey = parseRequiredString((mutationBody as Record<string, unknown>).idempotencyKey, "idempotencyKey")
  const rawExpectedUpdatedAt = (mutationBody as Record<string, unknown>).expectedUpdatedAt
  const expectedUpdatedAt =
    rawExpectedUpdatedAt === undefined || rawExpectedUpdatedAt === null || String(rawExpectedUpdatedAt).trim() === ""
      ? undefined
      : parseRequiredString(rawExpectedUpdatedAt, "expectedUpdatedAt")

  if (options.requireExpectedUpdatedAt && !expectedUpdatedAt) {
    throw createAppError("expectedUpdatedAt is required", { field: "expectedUpdatedAt" })
  }

  const inputBody = { ...body }
  delete inputBody.mutation

  return {
    input: parseInput(inputBody),
    mutation: {
      idempotencyKey,
      expectedUpdatedAt,
    },
  }
}

export function assertExpectedUpdatedAt(args: {
  actualUpdatedAt: string | Date
  expectedUpdatedAt?: string
  snapshot?: Record<string, unknown>
  message?: string
}) {
  if (!args.expectedUpdatedAt) {
    throw createAppError("expectedUpdatedAt is required", { field: "expectedUpdatedAt" })
  }

  const actualValue = args.actualUpdatedAt instanceof Date ? args.actualUpdatedAt.toISOString() : args.actualUpdatedAt
  if (actualValue !== args.expectedUpdatedAt) {
    throw createAppError(args.message ?? "Record changed before save completed. Refresh and try again.", {
      status: 409,
      field: "updatedAt",
      payload: args.snapshot ? { snapshot: args.snapshot } : undefined,
    })
  }
}

export async function enforceMutationReceipt(args: MutationReceiptContext) {
  const requestHash = buildMutationRequestHash({
    method: args.request.method,
    scope: args.scope,
    body: args.body,
  })
  const existing = await getAppMutationReceipt({
    scope: args.scope,
    userId: args.access.user.id,
    idempotencyKey: args.mutation.idempotencyKey,
  })

  if (existing && new Date(existing.expiresAt).getTime() >= Date.now()) {
    if (existing.requestHash !== requestHash) {
      throw createAppError("This idempotency key was already used with a different payload", {
        status: 409,
        field: "idempotencyKey",
      })
    }

    if (existing.completedAt && existing.responseBodyJson && existing.responseStatus !== null) {
      return {
        replay: jsonWithRequestId(
          existing.responseBodyJson as Record<string, unknown>,
          args.access.requestId,
          { status: existing.responseStatus },
        ),
        requestHash,
      }
    }

    throw createAppError("A matching mutation is already in progress", {
      status: 409,
      field: "idempotencyKey",
    })
  }

  try {
    await reserveAppMutationReceipt({
      scope: args.scope,
      userId: args.access.user.id,
      idempotencyKey: args.mutation.idempotencyKey,
      requestHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const retryExisting = await getAppMutationReceipt({
        scope: args.scope,
        userId: args.access.user.id,
        idempotencyKey: args.mutation.idempotencyKey,
      })

      if (retryExisting?.requestHash === requestHash && retryExisting.completedAt && retryExisting.responseBodyJson && retryExisting.responseStatus !== null) {
        return {
          replay: jsonWithRequestId(
            retryExisting.responseBodyJson as Record<string, unknown>,
            args.access.requestId,
            { status: retryExisting.responseStatus },
          ),
          requestHash,
        }
      }
    }

    throw error
  }

  return {
    replay: null,
    requestHash,
  }
}

export async function finalizeMutationReceipt(args: {
  scope: string
  access: AuthorizedRouteContext
  mutation: MutationMeta
  responseStatus: number
  responseBody: Record<string, unknown>
}) {
  await finalizeAppMutationReceipt({
    scope: args.scope,
    userId: args.access.user.id,
    idempotencyKey: args.mutation.idempotencyKey,
    responseStatus: args.responseStatus,
    responseBodyJson: args.responseBody as Prisma.InputJsonValue,
  })
}
