import { CutLogDomainError } from "../errors.js"

export function computeBeforeAfterForFinalize(input: {
  startingStock: string | number
  priorConsumed: string | number
  cut: string | number
}): { before: string; after: string } {
  const startingStock = Number(input.startingStock)
  const priorConsumed = Number(input.priorConsumed)
  const cut = Number(input.cut)
  if (
    !Number.isFinite(startingStock) ||
    !Number.isFinite(priorConsumed) ||
    !Number.isFinite(cut)
  ) {
    throw new CutLogDomainError("CUT_LOG_ARITHMETIC_MISMATCH", {
      startingStock: input.startingStock,
      priorConsumed: input.priorConsumed,
      cut: input.cut,
      reason: "non-finite-input",
    })
  }
  const before = startingStock - priorConsumed
  const after = before - cut
  return { before: before.toFixed(2), after: after.toFixed(2) }
}
