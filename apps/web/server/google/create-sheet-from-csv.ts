// Drive-backed CSV → native Google Sheet. One multipart `files.create` call: we
// hand Drive the CSV bytes plus a `application/vnd.google-apps.spreadsheet`
// target mime and Drive converts the upload into a real Sheet in the user's Drive.
// Keeps the whole export pipeline on the existing `toCsv` output — this only
// changes the delivery. Uses `fetch` (no googleapis SDK) to stay dependency-light.

const DRIVE_UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink"
const SHEET_MIME = "application/vnd.google-apps.spreadsheet"
// Long, distinctive boundary so it can never collide with CSV cell content.
const MULTIPART_BOUNDARY = "crs-export-3f9a1c7e6b2d4058boundary"

/** Thrown when Drive rejects the upload or returns no link. Surfaced as a 500 via `routeError`. */
export class GoogleSheetExportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GoogleSheetExportError"
  }
}

/**
 * Create a native Google Sheet from CSV in the caller's Drive and return its
 * shareable web link. `accessToken` must carry the `drive.file` scope.
 */
export async function createSheetFromCsv({
  accessToken,
  csv,
  name,
}: {
  accessToken: string
  csv: string
  name: string
}): Promise<{ url: string }> {
  const metadata = JSON.stringify({ name, mimeType: SHEET_MIME })
  const body =
    `--${MULTIPART_BOUNDARY}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${metadata}\r\n` +
    `--${MULTIPART_BOUNDARY}\r\n` +
    "Content-Type: text/csv; charset=UTF-8\r\n\r\n" +
    `${csv}\r\n` +
    `--${MULTIPART_BOUNDARY}--`

  const response = await fetch(DRIVE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${MULTIPART_BOUNDARY}`,
    },
    body,
  })

  if (!response.ok) {
    throw new GoogleSheetExportError(`Google Drive rejected the export (${response.status}).`)
  }

  const data = (await response.json().catch(() => null)) as { webViewLink?: string } | null
  if (!data?.webViewLink) {
    throw new GoogleSheetExportError("Google Drive did not return a sheet link.")
  }
  return { url: data.webViewLink }
}

/** `"Inventory export 2026-07-15"` — a stable, human-readable Sheet title. */
export function buildSheetName(moduleLabel: string): string {
  const day = new Date().toISOString().slice(0, 10)
  return `${moduleLabel} export ${day}`
}
