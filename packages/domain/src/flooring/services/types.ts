export type ServiceRow = {
  id: string
  name: string
  unitId: string
  unitName: string
  baseCost: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type UnitOption = {
  id: string
  name: string
}

export type ServiceForm = {
  name: string
  unitId: string
  baseCost: string
  notes: string
}

export const EMPTY_SERVICE_FORM: ServiceForm = {
  name: "",
  unitId: "",
  baseCost: "",
  notes: "",
}

export function validateServiceForm(input: ServiceForm) {
  if (!input.name.trim()) return "Service name is required"
  if (!input.unitId.trim()) return "Unit is required"
  if (!input.baseCost.trim()) return "Cost is required"
  return ""
}

export function toServiceForm(service: ServiceRow): ServiceForm {
  return {
    name: service.name,
    unitId: service.unitId,
    baseCost: service.baseCost,
    notes: service.notes,
  }
}
