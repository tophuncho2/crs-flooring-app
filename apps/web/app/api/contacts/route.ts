import { CONTACTS_TOOL_SLUG } from "@/modules/shared/access/lookup-domains"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { createContactUseCase } from "@builders/application"
import { listContacts } from "@builders/db"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateContactInput } from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: CONTACTS_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/contacts")
  if (rateLimited) return rateLimited

  try {
    return routeJson(access, { contacts: await listContacts() })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: CONTACTS_TOOL_SLUG,
    rateLimit: {
      scope: "contacts.write",
      limit: 60,
      windowMs: 10 * 60 * 1000,
      route: "/api/contacts",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateContactInput)
    const receipt = await enforceMutationReceipt({
      scope: "contacts.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const contact = await withMutationTelemetry(
      access,
      {
        message: "Contact created",
        action: "contacts.create",
        route: "/api/contacts",
        entityType: "flooringContact",
      },
      () => createContactUseCase(input),
    )

    const responseBody = { contact }
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
