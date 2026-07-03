/**
 * Batch-asserts every unit-of-measure id still exists, throwing a caller-supplied
 * error on the FIRST missing one (in array order). Mirrors `guardProductsExist`
 * for the unit FK: the inventory create passes its required `unitId`; the staged
 * section save passes only the non-empty unit ids (staged `unitId` is nullable).
 *
 * The unit read is injected (mirrors `guardProductsExist`'s `fetchProduct`), so
 * callers thread their own tx or pooled client into `fetchUnit`.
 */
export async function guardUnitsExist(
  unitIds: string[],
  fetchUnit: (unitId: string) => Promise<unknown>,
  makeError: (unitId: string) => Error,
): Promise<void> {
  const units = await Promise.all(
    unitIds.map(async (unitId) => ({
      unitId,
      unit: await fetchUnit(unitId),
    })),
  )
  for (const entry of units) {
    if (!entry.unit) throw makeError(entry.unitId)
  }
}
