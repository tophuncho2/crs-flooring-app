import { listUnitOfMeasures } from "@builders/db"
import type { UnitOption } from "@builders/domain"

export async function loadUnitOptions(): Promise<UnitOption[]> {
  const units = await listUnitOfMeasures()
  return units.map((u) => ({ id: u.id, name: u.name }))
}
