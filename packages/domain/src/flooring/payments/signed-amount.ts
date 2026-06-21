import { normalizeMoneyAmount } from "../../shared/money.js"
import type { FlooringPaymentDirection } from "./types.js"

/**
 * Canonical signed mapping for a payment amount: OUTFLOW → negative, INFLOW →
 * positive. Returns a fixed-scale-2 string (or `""` for empty/garbage input).
 *
 * Amounts are stored unsigned with the sign living in `direction`; this helper
 * is the single place that maps the pair to a signed value, so future sums /
 * running-balance logic can do one safe `SUM` instead of scattered CASE math.
 */
export function signedPaymentAmount(
  amount: string | number,
  direction: FlooringPaymentDirection,
): string {
  const normalized = normalizeMoneyAmount(amount)
  if (normalized === "" || normalized === "0.00") return normalized
  return direction === "OUTFLOW" ? `-${normalized}` : normalized
}
