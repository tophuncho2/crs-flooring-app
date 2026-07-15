import { exportAdjustmentsUseCase } from "@builders/application"
import { ADJUSTMENTS_EXPORT_COLUMNS, pickExportColumns, toCsv } from "@builders/domain"
import { EXPORT } from "@/server/http/rate-limit-presets"
import { applyRoutePolicy } from "@/server/http/route-policy"
import { routeCsv, routeError } from "@/server/http/route-helpers"
import { respondWithSheet } from "@/server/google/respond-with-sheet"
import { validateAdjustmentsExportRequest } from "../_validators"

/**
 * POST /api/adjustments/export — stream the filtered adjustments ledger as CSV.
 * Read-only (no mutation gauntlet), but on its own tighter `EXPORT` rate-limit
 * bucket so bulk pulls don't drain the shared list-browse allowance. The body
 * carries the same list query the page uses plus the ticked ids, picked
 * columns, and row cap. `x-export-total` reports the full match count so the
 * client can flag "first N of M" when the cap truncates.
 */
export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    rateLimit: { ...EXPORT, scope: "adjustments.export", route: "/api/adjustments/export" },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as unknown
    const { input, columns, format } = validateAdjustmentsExportRequest(body)
    const { rows, total } = await exportAdjustmentsUseCase(input)
    const csv = toCsv(rows, pickExportColumns(ADJUSTMENTS_EXPORT_COLUMNS, columns), { bom: true })

    if (format === "csv") {
      return routeCsv(access, csv, {
        filename: "adjustments-export.csv",
        extraHeaders: { "x-export-total": String(total), "x-export-count": String(rows.length) },
      })
    }

    return respondWithSheet(access, { csv, moduleLabel: "Adjustments", total, count: rows.length })
  } catch (error) {
    return routeError(access, error)
  }
}
