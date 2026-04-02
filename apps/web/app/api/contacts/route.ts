import { CONTACTS_TOOL_SLUG, authorizeContactsRoute } from "@/modules/shared/access/lookup-domains"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { createContactEntry } from "@/modules/contacts/application/manage-contact"
import { listContacts } from "@/modules/contacts/data/queries"
import { createAppError, parseRequiredString } from "@/server/http/api-helpers"
import { validateContactType } from "@/modules/contacts/domain/types"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

function parseContactType(value: unknown) {
  const type = parseRequiredString(value, "type")

  if (!validateContactType(type)) {
    throw createAppError("type must be Sales Rep, Contractor, or Other", { field: "type" })
  }

  return type
}

export async function GET(request: Request) {
  const access = await authorizeContactsRoute(request)
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
    const { input, mutation } = parseMutationEnvelope(body, (inputBody) => ({
      name: parseRequiredString(inputBody.name, "name"),
      type: parseContactType(inputBody.type),
    }))
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
      () => createContactEntry(input),
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
