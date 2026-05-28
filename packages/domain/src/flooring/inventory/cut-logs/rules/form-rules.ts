import type { CutLogPendingForm } from "../types.js"

export type CutLogPendingFormIssue =
  | { code: "CUT_LOG_CUT_REQUIRED" }
  | { code: "CUT_LOG_CUT_INVALID"; value: string }
  | { code: "CUT_LOG_CUT_NOT_POSITIVE"; value: string }

export function validateCutLogPendingForm(
  input: CutLogPendingForm,
): CutLogPendingFormIssue[] {
  const issues: CutLogPendingFormIssue[] = []

  const cutRaw = input.cut.trim()
  if (cutRaw.length === 0) {
    issues.push({ code: "CUT_LOG_CUT_REQUIRED" })
  } else {
    const cut = Number(cutRaw)
    if (!Number.isFinite(cut)) {
      issues.push({ code: "CUT_LOG_CUT_INVALID", value: input.cut })
    } else if (cut <= 0) {
      issues.push({ code: "CUT_LOG_CUT_NOT_POSITIVE", value: input.cut })
    }
  }

  return issues
}

export function describeCutLogPendingFormIssue(issue: CutLogPendingFormIssue): string {
  switch (issue.code) {
    case "CUT_LOG_CUT_REQUIRED":
      return "Cut value is required."
    case "CUT_LOG_CUT_INVALID":
      return "Cut value must be a number."
    case "CUT_LOG_CUT_NOT_POSITIVE":
      return "Cut value must be greater than zero."
  }
}

export function describeCutLogPendingFormIssues(issues: CutLogPendingFormIssue[]): string {
  return issues.map(describeCutLogPendingFormIssue).join(" ")
}
