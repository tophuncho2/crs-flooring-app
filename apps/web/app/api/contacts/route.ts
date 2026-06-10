import {
  createContactUseCase,
  listContactsUseCase,
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
  validateCreateContactInput,
  validateListContactsQuery,
} from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/contacts")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateListContactsQuery(url.searchParams)
    const result = await listContactsUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_CREATE,
      scope: "contacts.create",
      route: "/api/contacts",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreateContactInput)

    const receipt = await enforceMutationReceipt({
      scope: "contacts.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Contact created",
        action: "contacts.create",
        route: "/api/contacts",
        entityType: "flooringContact",
      },
      () => createContactUseCase(input),
    )

    const responseBody = { contact: result }
    await finalizeMutationReceipt({
      scope: "contacts.create",
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
