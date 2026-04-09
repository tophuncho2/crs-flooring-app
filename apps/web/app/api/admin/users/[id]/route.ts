import {
  deleteManagedUserUseCase,
  getManagedUserUseCase,
  updateManagedUserUseCase,
} from "@builders/application"
import type { UpdateManagedUserInput } from "@builders/application"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { createAppError, parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string }>
}

function validateUpdateManagedUserInput(body: unknown): UpdateManagedUserInput {
  if (!body || typeof body !== "object") {
    throw createAppError("Invalid request body", { status: 400 })
  }

  const record = body as Record<string, unknown>
  const input: UpdateManagedUserInput = {}

  if ("role" in record) {
    if (typeof record.role !== "string" || record.role.trim() === "") {
      throw createAppError("role must be a non-empty string", { field: "role" })
    }
    input.role = record.role.trim()
  }

  return input
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, { capability: "users.manage" })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/admin/users/[id]")
  if (rateLimited) return rateLimited

  const { id } = await params
  parseUuidParam(id, "id")

  try {
    const user = await getManagedUserUseCase(id, access.user)
    return routeJson(access, { user })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "users.manage",
    rateLimit: {
      scope: "users.update",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      route: "/api/admin/users/[id]",
    },
  })
  if (access instanceof Response) return access

  const { id } = await params
  parseUuidParam(id, "id")

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateManagedUserInput)

    const receipt = await enforceMutationReceipt({
      scope: "users.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const user = await withMutationTelemetry(
      access,
      {
        message: "User governance updated",
        action: "users.update",
        route: "/api/admin/users/[id]",
        entityType: "user",
        entityId: id,
      },
      () => updateManagedUserUseCase(id, input, access.user),
    )

    const responseBody = { user }
    await finalizeMutationReceipt({
      scope: "users.update",
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

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "users.manage",
    rateLimit: {
      scope: "users.delete",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/admin/users/[id]",
    },
  })
  if (access instanceof Response) return access

  const { id } = await params
  parseUuidParam(id, "id")

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value)

    const receipt = await enforceMutationReceipt({
      scope: "users.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    await withMutationTelemetry(
      access,
      {
        message: "User deleted",
        action: "users.delete",
        route: "/api/admin/users/[id]",
        entityType: "user",
        entityId: id,
      },
      () => deleteManagedUserUseCase(id, access.user),
    )

    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "users.delete",
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
