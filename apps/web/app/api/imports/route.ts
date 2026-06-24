import { createImportUseCase, listImportsUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateCreateImportInput, validateListImportsQuery } from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/imports")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateListImportsQuery(url.searchParams)
    const result = await listImportsUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_CREATE,
      scope: "imports.create",
      route: "/api/imports",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreateImportInput)

    const receipt = await enforceMutationReceipt({ scope: "imports.create", request, access, mutation, body })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Import created",
        action: "imports.create",
        route: "/api/imports",
        entityType: "flooringImportEntry",
      },
      () => createImportUseCase(input, access.user.email),
    )

    const responseBody = { import: result }
    await finalizeMutationReceipt({ scope: "imports.create", access, mutation, responseStatus: 201, responseBody })
    return routeJson(access, responseBody, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
