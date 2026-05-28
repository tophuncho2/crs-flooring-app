import { CutLogDomainError } from "../errors.js"

export function nextFinalCutSequence(currentMax: number | null): number {
  if (currentMax === null) return 1
  if (!Number.isFinite(currentMax) || currentMax < 0 || !Number.isInteger(currentMax)) {
    throw new CutLogDomainError("CUT_LOG_FINAL_SEQUENCE_INVALID", { currentMax })
  }
  return currentMax + 1
}
