import type { TemplateMaterialItemForm } from "./types.js"

export type TemplateMaterialItemDraft = {
  tempId: string
  form: TemplateMaterialItemForm
}

export type TemplateMaterialItemUpdate = {
  id: string
  form: TemplateMaterialItemForm
}

export type TemplateMaterialItemDelete = {
  id: string
}

export type TemplateMaterialItemsDiff = {
  added: TemplateMaterialItemDraft[]
  modified: TemplateMaterialItemUpdate[]
  deleted: TemplateMaterialItemDelete[]
}
