import { exportWorkOrdersUseCase } from "@builders/application"
import { WORK_ORDER_EXPORT_COLUMNS, pickExportColumns, toCsv } from "@builders/domain"
import { EXPORT } from "@/server/http/rate-limit-presets"
import { applyRoutePolicy } from "@/server/http/route-policy"
import { routeCsv, routeError } from "@/server/http/route-helpers"
import { validateWorkOrdersExportRequest } from "../_validators"

/**
 * POST /api/work-orders/export — stream the filtered work-order list as CSV.
 * Read-only (no mutation gauntlet), on the tighter `EXPORT` rate-limit bucket.
 * The body carries the same list query the page uses plus the ticked ids,
 * picked columns, and row cap. `x-export-total` reports the full match count so
 * the client can flag "first N of M" when the cap truncates.
 */
export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    rateLimit: { ...EXPORT, scope: "work-orders.export", route: "/api/work-orders/export" },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as unknown
    const { input, columns } = validateWorkOrdersExportRequest(body)
    const { rows, total } = await exportWorkOrdersUseCase(input)
    const csv = toCsv(rows, pickExportColumns(WORK_ORDER_EXPORT_COLUMNS, columns), { bom: true })

    return routeCsv(access, csv, {
      filename: "work-orders-export.csv",
      extraHeaders: { "x-export-total": String(total), "x-export-count": String(rows.length) },
    })
  } catch (error) {
    return routeError(access, error)
  }
}
