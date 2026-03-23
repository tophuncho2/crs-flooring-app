import { authorizeContactsRoute } from "@/features/flooring/shared/access/lookup-domains"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { createContact } from "@/features/flooring/contacts/data/server-mutations"
import { listContacts } from "@/features/flooring/contacts/data/queries"
import { createAppError, parseRequiredString } from "@/server/http/api-helpers"
import { validateContactType } from "@/features/flooring/contacts/domain/types"

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

  try {
    return routeJson(access, { contacts: await listContacts() })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await authorizeContactsRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "contacts.write",
    limit: 60,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/contacts",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = (await request.json()) as Record<string, unknown>
    const contact = await createContact({
      name: parseRequiredString(body.name, "name"),
      type: parseContactType(body.type),
    })

    logRouteMutationSuccess(access, {
      message: "Contact created",
      action: "contacts.create",
      route: "/api/flooring/contacts",
      entityType: "flooringContact",
      entityId: contact.id,
      details: { type: contact.type },
    })

    return routeJson(access, { contact }, { status: 201 })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Contact creation failed",
        action: "contacts.create.error",
        route: "/api/flooring/contacts",
        entityType: "flooringContact",
      },
      error,
    )
    return routeError(access, error)
  }
}
