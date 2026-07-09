import { createCertificateUseCase, listCertificatesUseCase } from "@builders/application"
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
import { validateCreateCertificateInput, validateListCertificatesQuery } from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/certificates")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateListCertificatesQuery(url.searchParams)
    const result = await listCertificatesUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_CREATE,
      scope: "certificates.create",
      route: "/api/certificates",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreateCertificateInput)

    const receipt = await enforceMutationReceipt({
      scope: "certificates.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Certificate created",
        action: "certificates.create",
        route: "/api/certificates",
        entityType: "certificate",
      },
      () => createCertificateUseCase(input, access.user.email),
    )

    const responseBody = { certificate: result }
    await finalizeMutationReceipt({
      scope: "certificates.create",
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
