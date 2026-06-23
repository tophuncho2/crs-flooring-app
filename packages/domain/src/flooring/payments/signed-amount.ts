import { formatMoney, normalizeMoneyAmount } from "../../shared/money.js"
import type { FlooringPaymentDirection } from "./types.js"

/**
 * Canonical signed mapping for a payment amount: EXPENSE → negative, REVENUE →
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
  return direction === "EXPENSE" ? `-${normalized}` : normalized
}

/** Display sign for a payment direction: `+` for REVENUE, `−` (U+2212) for EXPENSE. */
export function paymentDirectionSign(direction: FlooringPaymentDirection): "+" | "−" {
  return direction === "EXPENSE" ? "−" : "+"
}

/**
 * A payment amount with its direction sign prefixed, e.g. `+$1,234.00` / `−$50.00`.
 * Returns `"—"` when the amount is absent so the cell renders a plain placeholder.
 * Mirrors `formatSignedAdjustmentMoney`; the two converge in the enum-unification sweep.
 */
export function formatSignedPaymentAmount(
  amount: string | null,
  direction: FlooringPaymentDirection,
): string {
  if (amount == null || amount === "") return "—"
  const money = formatMoney(amount)
  if (money === "") return "—"
  return `${paymentDirectionSign(direction)}${money}`
}
