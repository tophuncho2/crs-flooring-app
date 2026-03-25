export function normalizeServiceOption(service: {
  id: string
  name: string
  baseCost: { toString(): string }
  notes?: string | null
  unit: { id: string; name: string }
}) {
  return {
    id: service.id,
    name: service.name,
    baseCost: service.baseCost.toString(),
    unitId: service.unit.id,
    unitName: service.unit.name,
    notes: service.notes ?? "",
  }
}

export function normalizeServiceRow(service: {
  id: string
  name: string
  baseCost: { toString(): string }
  notes: string | null
  createdAt: Date
  updatedAt: Date
  unit: { id: string; name: string }
  _count?: { templateItems: number; workOrderItems: number }
}) {
  return {
    id: service.id,
    name: service.name,
    unitId: service.unit.id,
    unitName: service.unit.name,
    baseCost: service.baseCost.toString(),
    notes: service.notes ?? "",
    usageCount: service._count ? service._count.templateItems + service._count.workOrderItems : 0,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  }
}
