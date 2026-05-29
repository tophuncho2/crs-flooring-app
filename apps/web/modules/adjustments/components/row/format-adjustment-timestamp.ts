// Pure UI helper. Delegates to the shared Eastern time-column primitive so
// adjustment timestamps render identically to other operational timestamps
// (e.g. inventory FIFO Received) — same format, pinned to Eastern, SSR-safe.
//
// Falls back to an em-dash for null / undefined / unparseable input so the
// grid renders consistent visual width even when a timestamp is missing.

import { formatEasternDateTime } from "@builders/domain"

const EMPTY = "—"

export function formatAdjustmentTimestamp(iso: string | undefined | null): string {
  return formatEasternDateTime(iso) || EMPTY
}
