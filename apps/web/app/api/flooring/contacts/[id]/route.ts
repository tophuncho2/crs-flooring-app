import { authorizeContactsRoute } from "@/features/flooring/shared/access/lookup-domains"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { createAppError, parseRequiredString } from "@/server/http/api-helpers"
import { deleteContact, updateContact } from "@/features/flooring/contacts/data/server-mutations"
import { validateContactType } from "@/features/flooring/contacts/domain/types"

type RouteContext = {
  params: Promise<{ id: string }>
}

function parseContactType(value: unknown) {
  const type = parseRequiredString(value, "type")

  if (!validateContactType(type)) {
    throw createAppError("type must be Sales Rep, Contractor, or Other", { field: "type" })
  }

  return type
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await authorizeContactsRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "contacts.write",
    limit: 60,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/contacts/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { id } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const contact = await updateContact(id, {
      name: parseRequiredString(body.name, "name"),
      type: parseContactType(body.type),
    })

    logRouteMutationSuccess(access, {
      message: "Contact updated",
      action: "contacts.update",
      route: "/api/flooring/contacts/[id]",
      entityType: "flooringContact",
      entityId: contact.id,
      details: { type: contact.type },
    })

    return routeJson(access, { contact })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Contact update failed",
        action: "contacts.update.error",
        route: "/api/flooring/contacts/[id]",
        entityType: "flooringContact",
        entityId: id,
      },
      error,
    )
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await authorizeContactsRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "contacts.delete",
    limit: 40,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/contacts/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { id } = await params

  try {
    await deleteContact(id)

    logRouteMutationSuccess(access, {
      message: "Contact deleted",
      action: "contacts.delete",
      route: "/api/flooring/contacts/[id]",
      entityType: "flooringContact",
      entityId: id,
    })

    return routeJson(access, { ok: true })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Contact deletion failed",
        action: "contacts.delete.error",
        route: "/api/flooring/contacts/[id]",
        entityType: "flooringContact",
        entityId: id,
      },
      error,
    )
    return routeError(access, error)
  }
}
