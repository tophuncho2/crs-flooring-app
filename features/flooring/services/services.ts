export function normalizeServiceOption(service: {
  id: string
  name: string
  baseCost: { toString(): string }
  unit: { id: string; name: string }
}) {
  return {
    id: service.id,
    name: service.name,
    baseCost: service.baseCost.toString(),
    unitId: service.unit.id,
    unitName: service.unit.name,
  }
}
