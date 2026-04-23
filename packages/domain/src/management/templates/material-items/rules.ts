import type { TemplateMaterialItemForm, TemplateMaterialItemRow } from "./types.js"

export function validateTemplateMaterialItemForm(input: TemplateMaterialItemForm) {
  if (!input.productId) return "Product is required"
  const quantity = Number(input.quantity)
  if (!input.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0) {
    return "Quantity must be greater than zero"
  }
  const unitPrice = Number(input.unitPrice)
  if (!input.unitPrice.trim() || !Number.isFinite(unitPrice) || unitPrice < 0) {
    return "Unit price must be zero or greater"
  }
  return ""
}

export type TemplateMaterialItemDiff = {
  creates: TemplateMaterialItemForm[]
  updates: Array<{ id: string; form: TemplateMaterialItemForm }>
  deletes: string[]
}

export function computeTemplateMaterialItemsDiff(
  existing: TemplateMaterialItemRow[],
  next: Array<{ id: string | null; form: TemplateMaterialItemForm }>,
): TemplateMaterialItemDiff {
  const existingById = new Map(existing.map((row) => [row.id, row]))
  const nextIds = new Set(next.map((entry) => entry.id).filter((id): id is string => Boolean(id)))

  const creates: TemplateMaterialItemForm[] = []
  const updates: Array<{ id: string; form: TemplateMaterialItemForm }> = []

  for (const entry of next) {
    if (!entry.id) {
      creates.push(entry.form)
      continue
    }
    if (existingById.has(entry.id)) {
      updates.push({ id: entry.id, form: entry.form })
    }
  }

  const deletes = existing
    .filter((row) => !nextIds.has(row.id))
    .map((row) => row.id)

  return { creates, updates, deletes }
}
