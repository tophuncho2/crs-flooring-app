import type { TemplateDetail } from "./types.js"
import type { TemplateMaterialItemRow } from "./material-items/types.js"

export type TemplateSnapshotItem = {
  id: string
  productId: string
  quantity: string
  sendUnitName: string
  sendUnitAbbrev: string
  notes: string
}

export type TemplateSnapshot = {
  templateId: string
  propertyId: string
  managementCompanyId: string | null
  jobTypeId: string | null
  warehouseId: string | null
  unitType: string
  description: string
  instructions: string
  templateNotes: string
  items: TemplateSnapshotItem[]
}

function pickItem(item: TemplateMaterialItemRow): TemplateSnapshotItem {
  return {
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    sendUnitName: item.sendUnitName,
    sendUnitAbbrev: item.sendUnitAbbrev,
    notes: item.notes,
  }
}

export function buildTemplateSnapshot(template: TemplateDetail): TemplateSnapshot {
  const items = template.items.map(pickItem).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return {
    templateId: template.id,
    propertyId: template.propertyId,
    managementCompanyId: template.managementCompanyId,
    jobTypeId: template.jobTypeId,
    warehouseId: template.warehouseId,
    unitType: template.unitType,
    description: template.description,
    instructions: template.instructions,
    templateNotes: template.templateNotes,
    items,
  }
}

export function buildTemplateSnapshotPayload(template: TemplateDetail): string {
  return JSON.stringify(buildTemplateSnapshot(template))
}
