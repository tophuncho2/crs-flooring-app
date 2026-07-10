import {
  createPaymentPurposeUseCase,
  listPaymentPurposesUseCase,
} from "@builders/application"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { enforceRankAtLeast } from "@/server/auth/route-auth"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import {
  validateCreatePaymentPurposeInput,
  validateListPaymentPurposesQuery,
} from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const forbidden = enforceRankAtLeast(access, ELEVATED_MODULE_MIN_RANK)
  if (forbidden) return forbidden

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/payment-purposes")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateListPaymentPurposesQuery(url.searchParams)
    const result = await listPaymentPurposesUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_CREATE,
      scope: "paymentPurposes.create",
      route: "/api/payment-purposes",
    },
  })
  if (access instanceof Response) return access

  const forbidden = enforceRankAtLeast(access, ELEVATED_MODULE_MIN_RANK)
  if (forbidden) return forbidden

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreatePaymentPurposeInput)

    const receipt = await enforceMutationReceipt({
      scope: "paymentPurposes.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Payment purpose created",
        action: "paymentPurposes.create",
        route: "/api/payment-purposes",
        entityType: "flooringPaymentPurpose",
      },
      () => createPaymentPurposeUseCase(input, access.user.email),
    )

    const responseBody = { paymentPurpose: result }
    await finalizeMutationReceipt({
      scope: "paymentPurposes.create",
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
