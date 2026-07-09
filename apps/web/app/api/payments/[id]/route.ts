import { RESTRICTED_MODULE_MIN_RANK } from "@builders/domain"
import {
  deletePaymentUseCase,
  getPaymentUseCase,
  updatePaymentUseCase,
} from "@builders/application"
import { enforceRankAtLeast } from "@/server/auth/route-auth"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_DELETE, CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateUpdatePaymentInput } from "../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const forbidden = enforceRankAtLeast(access, RESTRICTED_MODULE_MIN_RANK)
  if (forbidden) return forbidden

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/payments/[id]")
  if (rateLimited) return rateLimited

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const payment = await getPaymentUseCase(id)
    return routeJson(access, { payment })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_UPDATE_SECTION,
      scope: "payments.update",
      route: "/api/payments/[id]",
    },
  })
  if (access instanceof Response) return access

  const forbidden = enforceRankAtLeast(access, RESTRICTED_MODULE_MIN_RANK)
  if (forbidden) return forbidden

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdatePaymentInput, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getPaymentUseCase(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { payment: currentSnapshot },
      message: "Payment changed before your edit completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "payments.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Payment updated",
        action: "payments.update",
        route: "/api/payments/[id]",
        entityType: "flooringPayment",
        entityId: id,
      },
      () => updatePaymentUseCase(id, input, access.user.email),
    )

    const responseBody = { payment: result }
    await finalizeMutationReceipt({
      scope: "payments.update",
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
    rateLimit: {
      ...CRUD_DELETE,
      scope: "payments.delete",
      route: "/api/payments/[id]",
    },
  })
  if (access instanceof Response) return access

  const forbidden = enforceRankAtLeast(access, RESTRICTED_MODULE_MIN_RANK)
  if (forbidden) return forbidden

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getPaymentUseCase(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { payment: currentSnapshot },
      message: "Payment changed before delete completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "payments.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    await withMutationTelemetry(
      access,
      {
        message: "Payment deleted",
        action: "payments.delete",
        route: "/api/payments/[id]",
        entityType: "flooringPayment",
        entityId: id,
      },
      () => deletePaymentUseCase(id),
    )

    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "payments.delete",
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
