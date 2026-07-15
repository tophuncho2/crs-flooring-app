import { exportInventoryUseCase } from "@builders/application"
import { INVENTORY_EXPORT_COLUMNS, pickExportColumns, toCsv } from "@builders/domain"
import { EXPORT } from "@/server/http/rate-limit-presets"
import { applyRoutePolicy } from "@/server/http/route-policy"
import { routeCsv, routeError } from "@/server/http/route-helpers"
import { respondWithSheet } from "@/server/google/respond-with-sheet"
import { validateInventoryExportRequest } from "../_validators"

/**
 * POST /api/inventory/export — export the filtered inventory list. The primary
 * `format: "sheet"` creates a Google Sheet in the user's Drive and returns its
 * link; `format: "csv"` returns the CSV file download. Read-only (no mutation
 * gauntlet), but on its own tighter `EXPORT` rate-limit bucket so bulk pulls
 * don't drain the shared list-browse allowance. The body carries the same list
 * query the page uses plus the ticked ids, picked columns, and row cap.
 * `x-export-total` (csv) / `total` (sheet) reports the full match count so the
 * client can flag "first N of M" when the cap truncates.
 */
export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    rateLimit: { ...EXPORT, scope: "inventory.export", route: "/api/inventory/export" },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as unknown
    const { input, columns, format } = validateInventoryExportRequest(body)
    const { rows, total } = await exportInventoryUseCase(input)
    const csv = toCsv(rows, pickExportColumns(INVENTORY_EXPORT_COLUMNS, columns), { bom: true })

    if (format === "csv") {
      return routeCsv(access, csv, {
        filename: "inventory-export.csv",
        extraHeaders: { "x-export-total": String(total), "x-export-count": String(rows.length) },
      })
    }

    return respondWithSheet(access, { csv, moduleLabel: "Inventory", total, count: rows.length })
  } catch (error) {
    return routeError(access, error)
  }
}
