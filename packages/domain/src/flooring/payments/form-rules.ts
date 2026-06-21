import { isValidMoneyAmount } from "../../shared/money.js"
import type { PaymentForm } from "./types.js"

export type PaymentFormIssue =
  | { code: "PAYMENT_AMOUNT_REQUIRED" }
  | { code: "PAYMENT_AMOUNT_INVALID"; value: string }
  | { code: "PAYMENT_AMOUNT_NOT_POSITIVE"; value: string }
  | { code: "PAYMENT_DIRECTION_REQUIRED" }

export function validatePaymentForm(input: PaymentForm): PaymentFormIssue[] {
  const issues: PaymentFormIssue[] = []

  const raw = input.amount.trim()
  if (raw.length === 0) {
    issues.push({ code: "PAYMENT_AMOUNT_REQUIRED" })
  } else if (!isValidMoneyAmount(raw)) {
    issues.push({ code: "PAYMENT_AMOUNT_INVALID", value: input.amount })
  } else if (Number(raw) <= 0) {
    issues.push({ code: "PAYMENT_AMOUNT_NOT_POSITIVE", value: input.amount })
  }

  if (input.direction !== "INFLOW" && input.direction !== "OUTFLOW") {
    issues.push({ code: "PAYMENT_DIRECTION_REQUIRED" })
  }

  return issues
}

export function describePaymentFormIssue(issue: PaymentFormIssue): string {
  switch (issue.code) {
    case "PAYMENT_AMOUNT_REQUIRED":
      return "Amount is required."
    case "PAYMENT_AMOUNT_INVALID":
      return "Amount must be a valid money value."
    case "PAYMENT_AMOUNT_NOT_POSITIVE":
      return "Amount must be greater than zero."
    case "PAYMENT_DIRECTION_REQUIRED":
      return "Direction (inflow or outflow) is required."
  }
}

export function describePaymentFormIssues(issues: PaymentFormIssue[]): string {
  return issues.map(describePaymentFormIssue).join(" ")
}
