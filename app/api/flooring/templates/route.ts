import { authorizeTemplatesRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { createTemplate } from "@/features/flooring/templates/mutations"
import { listTemplates } from "@/features/flooring/templates/queries"
import { validateCreateTemplateInput } from "@/features/flooring/templates/validators"
import { routeError, routeJson } from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  try {
    return routeJson(access, {
      templates: await listTemplates(undefined, {
        searchQuery: "",
        isAscendingSort: true,
        isGroupingEnabled: false,
        groupByKeys: [],
      }),
    })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const template = await createTemplate(validateCreateTemplateInput(body))
    return routeJson(access, { template }, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
