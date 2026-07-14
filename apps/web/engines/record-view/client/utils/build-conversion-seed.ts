/**
 * The conversion trio (+ display labels) seeded onto inventory / adjustment /
 * staged rows when a product is picked (or, for adjustments, from the parent
 * inventory). All six keys are shared verbatim by the source option shapes
 * (`ProductOption`, the parent-inventory context) and the target row drafts, so
 * — unlike `applyUnitSeed` — no key remapping is needed.
 */
export type ConversionSeedValues = {
  coverageUnitId: string
  coverageUnitName: string
  coverageUnitAbbrev: string
  coveragePerUnit: string
  conversionFormulaId: string
  conversionFormulaName: string
}

type ConversionSeedRow = ConversionSeedValues

/**
 * Seeds a row's conversion trio from a picked source (product / parent
 * inventory), or clears all six fields to "" when `source` is null. The FK ids
 * + `coveragePerUnit` are sent in the save diff; the two name/abbrev labels are
 * display-only picker triggers. All remain editable after seeding — seeding
 * only assists user integrity, it doesn't lock the values.
 */
export function buildConversionSeed<TRow extends ConversionSeedRow>(
  row: TRow,
  source: ConversionSeedValues | null,
): TRow {
  return {
    ...row,
    coverageUnitId: source?.coverageUnitId ?? "",
    coverageUnitName: source?.coverageUnitName ?? "",
    coverageUnitAbbrev: source?.coverageUnitAbbrev ?? "",
    coveragePerUnit: source?.coveragePerUnit ?? "",
    conversionFormulaId: source?.conversionFormulaId ?? "",
    conversionFormulaName: source?.conversionFormulaName ?? "",
  }
}
