import { exportInventoryUseCase } from "@builders/application"
import { INVENTORY_EXPORT_COLUMNS, pickExportColumns, toCsv } from "@builders/domain"
import { EXPORT } from "@/server/http/rate-limit-presets"
import { applyRoutePolicy } from "@/server/http/route-policy"
import { routeCsv, routeError } from "@/server/http/route-helpers"
import { validateInventoryExportRequest } from "../_validators"

/**
 * POST /api/inventory/export — stream the filtered inventory list as CSV.
 * Read-only (no mutation gauntlet), but on its own tighter `EXPORT` rate-limit
 * bucket so bulk pulls don't drain the shared list-browse allowance. The body
 * carries the same list query the page uses plus the ticked ids, picked
 * columns, and row cap. `x-export-total` reports the full match count so the
 * client can flag "first N of M" when the cap truncates.
 */
export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    rateLimit: { ...EXPORT, scope: "inventory.export", route: "/api/inventory/export" },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as unknown
    const { input, columns } = validateInventoryExportRequest(body)
    const { rows, total } = await exportInventoryUseCase(input)
    const csv = toCsv(rows, pickExportColumns(INVENTORY_EXPORT_COLUMNS, columns), { bom: true })

    return routeCsv(access, csv, {
      filename: "inventory-export.csv",
      extraHeaders: { "x-export-total": String(total), "x-export-count": String(rows.length) },
    })
  } catch (error) {
    return routeError(access, error)
  }
}
