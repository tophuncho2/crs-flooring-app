import {
  listJobTypeOptions,
  listManagementCompanyOptions,
  listPropertyOptions,
  listTemplateOptions,
  listWarehouseOptions,
} from "@builders/db"
import { WORK_ORDERS_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"

/**
 * GET /api/work-orders/options
 *
 * Aggregates the form-options datasets the WO record view needs:
 *  - properties (for the property picker)
 *  - warehouses (required field on the WO row)
 *  - jobTypes (optional; surfaces as a select)
 *  - managementCompanies (optional; surfaces as a select)
 *  - templates (optional; populates the "sync from template" picker)
 *
 * Material-item product + category pickers fetch from `/api/products/options`
 * and `/api/categories/options` directly via the canonical async-rich-dropdown
 * controller. Those are not aggregated here.
 */
export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: WORK_ORDERS_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/work-orders/options")
  if (rateLimited) return rateLimited

  try {
    const [properties, warehouses, jobTypes, managementCompanies, templates] = await Promise.all([
      listPropertyOptions(),
      listWarehouseOptions(),
      listJobTypeOptions(),
      listManagementCompanyOptions(),
      listTemplateOptions(),
    ])
    return routeJson(access, {
      properties,
      warehouses,
      jobTypes,
      managementCompanies,
      templates,
    })
  } catch (error) {
    return routeError(access, error)
  }
}
