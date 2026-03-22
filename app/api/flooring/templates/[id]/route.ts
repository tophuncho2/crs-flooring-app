import { authorizeTemplatesRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { deleteTemplate, updateTemplate } from "@/features/flooring/templates/mutations"
import { getTemplateById } from "@/features/flooring/templates/queries"
import { validateUpdateTemplateInput } from "@/features/flooring/templates/validators"
import { routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await params
    return routeJson(access, { template: await getTemplateById(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const template = await updateTemplate(id, validateUpdateTemplateInput(body))
    return routeJson(access, { template })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await params
    await deleteTemplate(id)
    return routeJson(access, { ok: true })
  } catch (error) {
    return routeError(access, error)
  }
}
