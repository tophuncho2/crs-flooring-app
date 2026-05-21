import { searchInventoryImportNumberOptionsUseCase } from "@builders/application"
import { authorizeWarehouseRoute } from "@/modules/shared/access/domain-tools"
import { enforceQueryRateLimit } from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateInventoryImportNumberOptionsQuery } from "../../_validators"

export async function GET(request: Request) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/inventory/options/imports",
  )
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateInventoryImportNumberOptionsQuery(url.searchParams)
    const options = await searchInventoryImportNumberOptionsUseCase(input)
    return routeJson(access, { options })
  } catch (error) {
    return routeError(access, error)
  }
}
