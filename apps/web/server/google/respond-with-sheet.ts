import type { AuthorizedRouteContext } from "@/server/auth/route-auth"
import { routeJson } from "@/server/http/route-helpers"
import { jsonWithRequestId } from "@/server/platform/request-context"
import { buildSheetName, createSheetFromCsv } from "./create-sheet-from-csv"
import { getGoogleAccessToken } from "./google-access-token"

/**
 * Protocol code the client checks for on a failed Sheets export to swap its error
 * message for a "Connect Google Drive" action. Mirrored verbatim in the export button
 * (`engines/list-view/toolbar/export/list-export-button.tsx`) — keep the two in sync.
 */
export const GOOGLE_REAUTH_CODE = "google_reauth_required"

/**
 * Turn an already-serialized CSV into a Google Sheet in the caller's Drive and
 * respond with `{ url, total, count }`. When the user has no Drive-scoped token
 * yet, returns a 409 carrying {@link GOOGLE_REAUTH_CODE} so the client prompts the
 * user to connect Drive (incremental auth — most users hit this on first export).
 * A Drive failure propagates to the route's `catch` → `routeError`.
 */
export async function respondWithSheet(
  access: AuthorizedRouteContext,
  { csv, moduleLabel, total, count }: { csv: string; moduleLabel: string; total: number; count: number },
): Promise<Response> {
  const accessToken = await getGoogleAccessToken()
  if (!accessToken) {
    return jsonWithRequestId(
      { error: "Connect Google Drive to export to Sheets.", code: GOOGLE_REAUTH_CODE },
      access.requestId,
      { status: 409 },
    )
  }

  const { url } = await createSheetFromCsv({ accessToken, csv, name: buildSheetName(moduleLabel) })
  return routeJson(access, { url, total, count })
}
