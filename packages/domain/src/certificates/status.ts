// Read-time certificate expiration status. The "days until expiration" is NOT a
// Postgres generated column — a `CURRENT_DATE - expirationDate` diff is not
// immutable (Postgres rejects it as GENERATED … STORED) and any stored value
// would be stale the day after write. So this pure helper is the single source
// of truth and the data-layer normalizer calls it at READ time (an allowed
// carve-out: pure computation, no throwing rule). Mirrors the read-time compute
// convention used by inventory balances.

import { toStableDate } from "../shared/date-format.js"

// A plain string subset of the `@/engines/common` CellTone vocabulary, kept as a
// string union so pure domain never imports the web engine.
export type CertificateStatusTone = "success" | "warning" | "error" | "muted"

export type CertificateStatusKey = "expired" | "expiring" | "valid" | "none"

export type CertificateStatus = {
  key: CertificateStatusKey
  label: string
  tone: CertificateStatusTone
  daysUntilExpiration: number | null
}

/** A certificate this many days (or fewer) from expiring is "Expiring Soon". */
export const CERTIFICATE_EXPIRING_SOON_DAYS = 30

const MS_PER_DAY = 24 * 60 * 60 * 1000

// Collapse a timestamp to a UTC calendar-day index so the day count never drifts
// across timezones — matches `formatStableDate` (which renders dates in UTC).
function toUtcDayIndex(value: Date): number {
  return Math.floor(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()) / MS_PER_DAY,
  )
}

const NO_EXPIRATION: CertificateStatus = {
  key: "none",
  label: "No Expiration",
  tone: "muted",
  daysUntilExpiration: null,
}

/**
 * Derives a certificate's expiration status from its expiration date. `now` is
 * injectable so tests are deterministic. A missing/empty/unparseable expiration
 * date yields "No Expiration".
 */
export function computeCertificateStatus(
  expirationDate: string | Date | null | undefined,
  now: Date = new Date(),
): CertificateStatus {
  if (expirationDate === null || expirationDate === undefined || expirationDate === "") {
    return NO_EXPIRATION
  }

  // Shared parser (UTC-stable): a bare YYYY-MM-DD pins to UTC midnight so the
  // day count never drifts across timezones — same helper the formatters use.
  const expiration = toStableDate(expirationDate)

  if (Number.isNaN(expiration.getTime())) {
    return NO_EXPIRATION
  }

  const daysUntilExpiration = toUtcDayIndex(expiration) - toUtcDayIndex(now)

  if (daysUntilExpiration < 0) {
    return { key: "expired", label: "Expired", tone: "error", daysUntilExpiration }
  }

  if (daysUntilExpiration <= CERTIFICATE_EXPIRING_SOON_DAYS) {
    return { key: "expiring", label: "Expiring Soon", tone: "warning", daysUntilExpiration }
  }

  return { key: "valid", label: "Valid", tone: "success", daysUntilExpiration }
}
