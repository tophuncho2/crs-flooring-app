import {
  createLaborPaymentUseCase,
  listLaborPaymentsUseCase,
} from "@builders/application"
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
  validateCreateLaborPaymentInput,
  validateListLaborPaymentsQuery,
} from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/labor-payments")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateListLaborPaymentsQuery(url.searchParams)
    const result = await listLaborPaymentsUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_CREATE,
      scope: "laborPayments.create",
      route: "/api/labor-payments",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreateLaborPaymentInput)

    const receipt = await enforceMutationReceipt({
      scope: "laborPayments.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Labor payment created",
        action: "laborPayments.create",
        route: "/api/labor-payments",
        entityType: "flooringLaborPayment",
      },
      () => createLaborPaymentUseCase(input),
    )

    const responseBody = { laborPayment: result }
    await finalizeMutationReceipt({
      scope: "laborPayments.create",
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
