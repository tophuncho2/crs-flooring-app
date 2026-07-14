import { convertQuantity, type ConversionFormulaInput } from "@builders/domain"

/**
 * The joined `conversionFormula` shape selected across the inventory/adjustment/
 * staged row selects. Mirrors `conversionFormula: { id, name, fromUnitId,
 * operator, factorMode, constantFactor, toUnit } ` — `null` when the row has no
 * formula linked.
 */
export type ConversionFormulaJoin = {
  id: string
  name: string
  fromUnitId: string
  operator: "DIVIDE" | "MULTIPLY"
  factorMode: "CONSTANT" | "USE_COVERAGE_PER_UNIT"
  constantFactor: { toString(): string } | null
  toUnit: { id: string; name: string; abbreviation: string } | null
} | null

/**
 * Resolve the DERIVED conversion outputs for a row: the picked formula's label,
 * the target-unit labels, and the converted balance (`convertQuantity` applies
 * the source-unit guard + factor mode). Nothing here is stored — every value is
 * computed on read. Shared by the inventory, adjustment, and staged normalizers.
 */
export function resolveConversion(input: {
  formula: ConversionFormulaJoin
  rowUnitId: string | null
  coveragePerUnit: string | null
  balance: string
}): {
  conversionFormulaName: string
  conversionUnitName: string
  conversionUnitAbbrev: string
  convertedBalance: string
} {
  const { formula } = input
  const formulaInput: ConversionFormulaInput | null = formula
    ? {
        fromUnitId: formula.fromUnitId,
        operator: formula.operator,
        factorMode: formula.factorMode,
        constantFactor: formula.constantFactor?.toString() ?? null,
      }
    : null
  const convertedBalance = convertQuantity({
    balance: input.balance,
    rowUnitId: input.rowUnitId,
    coveragePerUnit: input.coveragePerUnit,
    formula: formulaInput,
  })
  return {
    conversionFormulaName: formula?.name ?? "",
    conversionUnitName: formula?.toUnit?.name ?? "",
    conversionUnitAbbrev: formula?.toUnit?.abbreviation ?? "",
    convertedBalance,
  }
}
