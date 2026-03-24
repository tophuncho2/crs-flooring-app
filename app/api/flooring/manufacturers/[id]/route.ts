import { parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { prisma } from "@/server/db/prisma"
import { updateManufacturer } from "@/features/flooring/manufacturers/mutations"
import { normalizeManufacturer } from "@/features/flooring/manufacturers/services"
import { authorizeManufacturersRoute } from "@/features/flooring/shared/access/lookup-domains"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await authorizeManufacturersRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "manufacturers.write",
    limit: 20,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/manufacturers/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const companyName = parseRequiredString(body.companyName, "companyName")
    const agentName = parseOptionalString(body.agentName ?? body.name)
    const manufacturer = await updateManufacturer(id, {
      companyName,
      agentName,
      website: parseOptionalString(body.website),
      phone: parseOptionalString(body.phone),
      email: parseOptionalString(body.email),
    })

    return routeJson(access, { manufacturer: normalizeManufacturer(manufacturer) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await authorizeManufacturersRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "manufacturers.delete",
    limit: 10,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/manufacturers/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await context.params
    const linkedProducts = await prisma.flooringProduct.count({
      where: { manufacturerId: id },
    })

    if (linkedProducts > 0) {
      return routeJson(
        access,
        { error: "This manufacturer has linked products and cannot be deleted" },
        { status: 409 },
      )
    }

    await prisma.flooringManufacturer.delete({ where: { id } })
    return routeJson(access, { ok: true })
  } catch (error) {
    return routeError(access, error)
  }
}
