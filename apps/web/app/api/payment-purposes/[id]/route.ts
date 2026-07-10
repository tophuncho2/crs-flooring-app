import { deletePaymentPurposeUseCase, PaymentPurposeExecutionError } from "@builders/application"
import { getPaymentPurposeById, getPaymentPurposeDetailById } from "@builders/db"
import { ELEVATED_MODULE_MIN_RANK, PAYMENT_PURPOSE_NOT_FOUND_MESSAGE } from "@builders/domain"
import { enforceRankAtLeast } from "@/server/auth/route-auth"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const forbidden = enforceRankAtLeast(access, ELEVATED_MODULE_MIN_RANK)
  if (forbidden) return forbidden

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/payment-purposes/[id]")
  if (rateLimited) return rateLimited

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const paymentPurpose = await getPaymentPurposeDetailById(id, { withNeighbors: true })
    if (!paymentPurpose) {
      throw new PaymentPurposeExecutionError({
        code: "PAYMENT_PURPOSE_NOT_FOUND",
        message: PAYMENT_PURPOSE_NOT_FOUND_MESSAGE,
        status: 404,
      })
    }
    return routeJson(access, { paymentPurpose })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_DELETE,
      scope: "paymentPurposes.delete",
      route: "/api/payment-purposes/[id]",
    },
  })
  if (access instanceof Response) return access

  const forbidden = enforceRankAtLeast(access, ELEVATED_MODULE_MIN_RANK)
  if (forbidden) return forbidden

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input: _input, mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getPaymentPurposeById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { paymentPurpose: currentSnapshot },
      message: "Payment purpose changed before delete completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "paymentPurposes.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    await withMutationTelemetry(
      access,
      {
        message: "Payment purpose deleted",
        action: "paymentPurposes.delete",
        route: "/api/payment-purposes/[id]",
        entityType: "flooringPaymentPurpose",
        entityId: id,
      },
      () => deletePaymentPurposeUseCase(id),
    )

    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "paymentPurposes.delete",
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
