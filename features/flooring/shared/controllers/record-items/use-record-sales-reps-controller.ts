"use client"

import { useEffect, useRef, useState } from "react"
import {
  clearFieldError,
  clearRowFieldError,
  getRequestFieldError,
  setFieldError,
  setRowFieldErrors,
  type RowFieldErrors,
} from "@/features/flooring/shared/ui/record-items/record-field-errors"
import {
  validateSalesRepFields,
  type EditableSalesRepItem,
  type SalesRepDraft,
  type SalesRepField,
  type SalesRepFieldErrors,
} from "@/features/flooring/shared/ui/record-items/sales-rep-items-editor"
import type { RecordNotices } from "@/features/flooring/shared/controllers/record-page/use-record-notices"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/flooring/shared/ui/table/confirm-delete"

type CollectionHandle<TItem, TCreateInput, TUpdateInput> = {
  items: TItem[]
  setItems: (value: TItem[] | ((previous: TItem[]) => TItem[])) => void
  loading: boolean
  adding: boolean
  savingItemId: string | null
  deletingItemId: string | null
  createItem: (input: TCreateInput) => Promise<TItem[]>
  updateItem: (itemId: string, input: TUpdateInput) => Promise<TItem[]>
  deleteItem: (itemId: string) => Promise<TItem[]>
}

export function useRecordSalesRepsController<TRecord, TSalesRep extends EditableSalesRepItem>({
  record,
  notices,
  clearParentError,
  salesRepCollection,
  initialDraft,
  getItemsFromRecord,
  onItemsChanged,
}: {
  record: TRecord | null
  notices: Pick<RecordNotices, "clearNotices" | "showSuccess" | "showError">
  clearParentError: () => void
  salesRepCollection: CollectionHandle<TSalesRep, SalesRepDraft, EditableSalesRepItem>
  initialDraft: SalesRepDraft
  getItemsFromRecord: (record: TRecord) => TSalesRep[]
  onItemsChanged: (args: { record: TRecord; salesReps: TSalesRep[]; action: "add" | "save" | "delete" }) => void
}) {
  const [draft, setDraft] = useState<SalesRepDraft>(initialDraft)
  const [draftErrors, setDraftErrors] = useState<SalesRepFieldErrors>({})
  const [itemErrors, setItemErrors] = useState<RowFieldErrors<SalesRepField>>({})
  const recordRef = useRef(record)
  const itemsRef = useRef(salesRepCollection.items)
  const onItemsChangedRef = useRef(onItemsChanged)

  useEffect(() => {
    recordRef.current = record
  }, [record])

  useEffect(() => {
    itemsRef.current = salesRepCollection.items
  }, [salesRepCollection.items])

  useEffect(() => {
    onItemsChangedRef.current = onItemsChanged
  }, [onItemsChanged])

  useEffect(() => {
    if (!record) {
      return
    }

    salesRepCollection.setItems(getItemsFromRecord(record))
  }, [getItemsFromRecord, record, salesRepCollection.setItems])

  function clearMutationState() {
    clearParentError()
    notices.clearNotices()
  }

  function publishItems(action: "add" | "save" | "delete", salesReps: TSalesRep[]) {
    const currentRecord = recordRef.current
    if (!currentRecord) {
      return
    }

    onItemsChangedRef.current({
      record: currentRecord,
      salesReps,
      action,
    })
  }

  function handleDraftChange(field: keyof SalesRepDraft, value: string) {
    setDraft((previous) => ({ ...previous, [field]: value }))
    if (field === "contactId" || field === "percent") {
      setDraftErrors((previous) => clearFieldError(previous, field))
    }
  }

  function handleItemFieldChange(itemId: string, field: keyof EditableSalesRepItem, value: string) {
    salesRepCollection.setItems((previous) =>
      previous.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    )

    if (field === "contactId" || field === "percent") {
      setItemErrors((previous) => clearRowFieldError(previous, itemId, field))
    }
  }

  async function addItem() {
    if (!recordRef.current) {
      return false
    }

    clearMutationState()
    const validationErrors = validateSalesRepFields(draft)
    if (Object.keys(validationErrors).length > 0) {
      setDraftErrors(validationErrors)
      notices.showError("Fix the highlighted sales rep fields before adding.")
      return false
    }

    try {
      const nextItems = await salesRepCollection.createItem(draft)
      setDraft(initialDraft)
      setDraftErrors({})
      publishItems("add", nextItems)
      notices.showSuccess("Sales rep added")
      return true
    } catch (error) {
      const fieldError = getRequestFieldError(error)
      const field = fieldError.field
      if (field === "contactId" || field === "percent") {
        setDraftErrors(setFieldError(field, fieldError.message))
      }
      notices.showError(fieldError.message || "Failed to add sales rep")
      return false
    }
  }

  async function saveItem(item: EditableSalesRepItem) {
    if (!recordRef.current) {
      return
    }

    clearMutationState()
    const validationErrors = validateSalesRepFields(item)
    if (Object.keys(validationErrors).length > 0) {
      setItemErrors((previous) => setRowFieldErrors(previous, item.id, validationErrors))
      notices.showError("Fix the highlighted sales rep fields before saving.")
      return
    }

    try {
      const nextItems = await salesRepCollection.updateItem(item.id, item)
      setItemErrors((previous) => setRowFieldErrors(previous, item.id, {}))
      publishItems("save", nextItems)
      notices.showSuccess("Sales rep saved")
    } catch (error) {
      const fieldError = getRequestFieldError(error)
      const field = fieldError.field
      if (field === "contactId" || field === "percent") {
        setItemErrors((previous) => setRowFieldErrors(previous, item.id, setFieldError(field, fieldError.message)))
      }
      notices.showError(fieldError.message || "Failed to save sales rep")
    }
  }

  async function deleteItem(itemId: string) {
    if (!recordRef.current) {
      return
    }

    if (!confirmRecordDelete(buildDeleteConfirmationMessage("sales rep"))) {
      return
    }

    clearMutationState()
    try {
      const nextItems = await salesRepCollection.deleteItem(itemId)
      setItemErrors((previous) => setRowFieldErrors(previous, itemId, {}))
      publishItems("delete", nextItems)
      notices.showSuccess("Sales rep deleted")
    } catch (error) {
      const fieldError = getRequestFieldError(error)
      notices.showError(fieldError.message || "Failed to delete sales rep")
    }
  }

  return {
    draft,
    draftErrors,
    itemErrors,
    salesReps: salesRepCollection.items,
    salesRepCollection,
    handleDraftChange,
    handleItemFieldChange,
    addItem,
    saveItem,
    deleteItem,
  }
}
