import {
  listCategories,
  listJobTypeOptions,
  listEntityOptions,
  listProductOptions,
  listPropertyOptions,
  listTemplateOptions,
  listWarehouseOptions,
} from "@builders/db"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"

/**
 * GET /api/work-orders/options
 *
 * Aggregates the form-options datasets the WO record view needs:
 *  - properties (for the property picker)
 *  - warehouses (required field on the WO row)
 *  - jobTypes (optional; surfaces as a select)
 *  - entities (optional; surfaces as a select)
 *  - templates (optional; populates the "sync from template" picker)
 *  - products (powers the material-items product picker, filtered
 *    client-side by the chosen category)
 *  - categories (populates the category-filter dropdown that narrows
 *    the product picker)
 */
export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/work-orders/options")
  if (rateLimited) return rateLimited

  try {
    const [
      properties,
      warehouses,
      jobTypes,
      entities,
      templates,
      products,
      categories,
    ] = await Promise.all([
      listPropertyOptions(),
      listWarehouseOptions(),
      listJobTypeOptions(),
      listEntityOptions(),
      listTemplateOptions(),
      listProductOptions(),
      listCategories(),
    ])
    return routeJson(access, {
      properties,
      warehouses,
      jobTypes,
      entities,
      templates,
      products,
      categories,
    })
  } catch (error) {
    return routeError(access, error)
  }
}
