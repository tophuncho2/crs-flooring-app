import { deleteManagementCompany, updateManagementCompany } from "@/features/flooring/management-companies/data/mutations"
import { getManagementCompanyById } from "@/features/flooring/management-companies/data/queries"
import { validateUpdateManagementCompanyInput } from "@/features/flooring/management-companies/domain/validators"
import { requireRouteAccess, routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    return routeJson(access, { managementCompany: await getManagementCompanyById(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const managementCompany = await updateManagementCompany(id, validateUpdateManagementCompanyInput(body))
    return routeJson(access, { managementCompany })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    await deleteManagementCompany(id)
    return routeJson(access, { ok: true })
  } catch (error) {
    return routeError(access, error)
  }
}
