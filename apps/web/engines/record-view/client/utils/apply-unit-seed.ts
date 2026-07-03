export type UnitSeedValues = {
  unitId: string
  unitName: string
  unitAbbrev: string
}

/**
 * Seeds a row's unit trio (`unitId` + a display name + an abbrev, under the
 * caller's key names) from a picked option, or clears all three to "" when
 * `unit` is null. Rows expose the label under `unitName`/`unitAbbrev`, and the
 * two source-option shapes (`ProductOption` / `UnitOfMeasureOption`) expose the
 * values under different names, so the caller does the tiny extraction and
 * passes the normalized trio + the target keys. Display-only fields — never
 * enters a save payload (the unit reaches the server as the `unitId` FK only).
 */
export function applyUnitSeed<TRow extends { unitId: string }>(
  row: TRow,
  unit: UnitSeedValues | null,
  keys: { nameKey: keyof TRow & string; abbrevKey: keyof TRow & string },
): TRow {
  return {
    ...row,
    unitId: unit?.unitId ?? "",
    [keys.nameKey]: unit?.unitName ?? "",
    [keys.abbrevKey]: unit?.unitAbbrev ?? "",
  } as TRow
}
