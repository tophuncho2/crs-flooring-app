import {
  createManagedUserUseCase,
  isGovernanceExecutionError,
  listManagedUsersUseCase,
} from "@builders/application"
import type { GovernableRole } from "@builders/domain"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { parseRequiredString } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

function validateCreateUserInput(body: unknown): { email: string; role: string } {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body")
  }

  const record = body as Record<string, unknown>

  return {
    email: parseRequiredString(record.email, "email"),
    role: parseRequiredString(record.role, "role"),
  }
}

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, { capability: "users.manage" })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/admin/users")
  if (rateLimited) return rateLimited

  try {
    const result = await listManagedUsersUseCase({ id: access.user.id, role: access.user.role as GovernableRole })
    return routeJson(access, { users: result.users })
  } catch (error) {
    if (isGovernanceExecutionError(error)) {
      return routeJson(access, { error: error.message, field: error.field }, { status: error.status })
    }
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "users.manage",
    rateLimit: {
      scope: "users.create",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      route: "/api/admin/users",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreateUserInput)

    const receipt = await enforceMutationReceipt({
      scope: "users.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const user = await withMutationTelemetry(
      access,
      {
        message: "User created",
        action: "users.create",
        route: "/api/admin/users",
        entityType: "user",
      },
      () => createManagedUserUseCase(input, { id: access.user.id, role: access.user.role as GovernableRole }),
    )

    const responseBody = { user }
    await finalizeMutationReceipt({
      scope: "users.create",
      access,
      mutation,
      responseStatus: 201,
      responseBody,
    })
    return routeJson(access, responseBody, { status: 201 })
  } catch (error) {
    if (isGovernanceExecutionError(error)) {
      return routeJson(access, { error: error.message, field: error.field }, { status: error.status })
    }
    return routeError(access, error)
  }
}
