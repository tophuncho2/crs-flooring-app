"use client"

import { RecordSectionErrorPanel } from "@/engines/record-view"
import { ErrorNotice, SuccessNotice } from "@/components/feedback/notices"
import type { RecordSectionError } from "@/types/record/section-error"

export type HubSidePanelNoticeProps = {
  /**
   * Failure feedback. A `RecordSectionError` (run a thrown request error
   * through `normalizeRecordSectionError`) renders the rich, tone-coded
   * panel — a 409 reads as a titled "Conflict" / "Out of date" box with the
   * request id. A plain string renders the compact rose notice.
   */
  error?: RecordSectionError | string | null
  /** Confirmation feedback (e.g. "Warehouse created"). Renders the emerald notice. */
  successMessage?: string | null
  className?: string
}

function isTypedError(value: unknown): value is RecordSectionError {
  return typeof value === "object" && value !== null && "kind" in value
}

/**
 * Feedback surface for the hub side-panel family. Composes the shared
 * app-level notice primitives so every hub panel styles error and success
 * messages identically. Success stacks above error. Renders nothing when
 * there is no feedback to show.
 *
 * Lives in the sticky edit toolbar by default (see `HubSidePanelEditToolbar`)
 * but is a standalone component — drop it anywhere a hub mode needs a notice.
 */
export function HubSidePanelNotice({
  error,
  successMessage,
  className,
}: HubSidePanelNoticeProps) {
  if (!error && !successMessage) return null

  return (
    <div className={["space-y-2", className].filter(Boolean).join(" ")}>
      {successMessage ? (
        <div role="status">
          <SuccessNotice>{successMessage}</SuccessNotice>
        </div>
      ) : null}
      {error ? (
        <div role="alert">
          {isTypedError(error) ? (
            <RecordSectionErrorPanel error={error} />
          ) : (
            <ErrorNotice>{error}</ErrorNotice>
          )}
        </div>
      ) : null}
    </div>
  )
}
