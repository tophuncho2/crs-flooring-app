"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  clearFieldError,
  clearRowFieldError,
  getRequestFieldError,
  setFieldError,
  setRowFieldErrors,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import {
  validateMaterialItemFields,
  type EditableMaterialItem,
  type MaterialItemDraft,
  type MaterialItemField,
  type MaterialItemFieldErrors,
} from "@/features/flooring/shared/line-items/material-items-editor"
import {
  validateServiceItemFields,
  type EditableServiceItem,
  type ServiceItemDraft,
  type ServiceItemField,
  type ServiceItemFieldErrors,
} from "@/features/flooring/shared/line-items/service-items-editor"
import type { RecordNotices } from "@/features/dashboard/shared/record-view/client/use-record-notices"
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

type LineItemMutationKind = "material" | "service"
type LineItemMutationAction = "add" | "save" | "delete"

type PublishLineItemsArgs<TRecord, TMaterialItem extends EditableMaterialItem, TServiceItem extends EditableServiceItem> = {
  record: TRecord
  materialItems: TMaterialItem[]
  serviceItems: TServiceItem[]
  kind: LineItemMutationKind
  action: LineItemMutationAction
}

export function useRecordLineItemsController<
  TRecord,
  TMaterialItem extends EditableMaterialItem,
  TServiceItem extends EditableServiceItem,
>({
  record,
  notices,
  clearParentError,
  materialCollection,
  serviceCollection,
  initialMaterialDraft,
  initialServiceDraft,
  getCollectionsFromRecord,
  onCollectionsChanged,
}: {
  record: TRecord | null
  notices: Pick<RecordNotices, "clearNotices" | "showSuccess" | "showError">
  clearParentError: () => void
  materialCollection: CollectionHandle<TMaterialItem, MaterialItemDraft, EditableMaterialItem>
  serviceCollection: CollectionHandle<TServiceItem, ServiceItemDraft, EditableServiceItem>
  initialMaterialDraft: MaterialItemDraft
  initialServiceDraft: ServiceItemDraft
  getCollectionsFromRecord: (record: TRecord) => {
    materialItems: TMaterialItem[]
    serviceItems: TServiceItem[]
  }
  onCollectionsChanged: (args: PublishLineItemsArgs<TRecord, TMaterialItem, TServiceItem>) => void
}) {
  const { items: materialItems, setItems: setMaterialItems } = materialCollection
  const { items: serviceItems, setItems: setServiceItems } = serviceCollection
  const [materialDraft, setMaterialDraft] = useState<MaterialItemDraft>(initialMaterialDraft)
  const [serviceDraft, setServiceDraft] = useState<ServiceItemDraft>(initialServiceDraft)
  const [materialDraftErrors, setMaterialDraftErrors] = useState<MaterialItemFieldErrors>({})
  const [materialItemErrors, setMaterialItemErrors] = useState<RowFieldErrors<MaterialItemField>>({})
  const [serviceDraftErrors, setServiceDraftErrors] = useState<ServiceItemFieldErrors>({})
  const [serviceItemErrors, setServiceItemErrors] = useState<RowFieldErrors<ServiceItemField>>({})

  const recordRef = useRef(record)
  const materialItemsRef = useRef(materialCollection.items)
  const serviceItemsRef = useRef(serviceCollection.items)
  const onCollectionsChangedRef = useRef(onCollectionsChanged)
  const getCollectionsFromRecordRef = useRef(getCollectionsFromRecord)

  useEffect(() => {
    recordRef.current = record
  }, [record])

  useEffect(() => {
    materialItemsRef.current = materialItems
  }, [materialItems])

  useEffect(() => {
    serviceItemsRef.current = serviceItems
  }, [serviceItems])

  useEffect(() => {
    onCollectionsChangedRef.current = onCollectionsChanged
  }, [onCollectionsChanged])

  useEffect(() => {
    getCollectionsFromRecordRef.current = getCollectionsFromRecord
  }, [getCollectionsFromRecord])

  useEffect(() => {
    if (!record) {
      return
    }

    const { materialItems, serviceItems } = getCollectionsFromRecordRef.current(record)
    const nextMaterialItems = materialItems ?? []
    const nextServiceItems = serviceItems ?? []

    if (!Object.is(materialItemsRef.current, nextMaterialItems)) {
      setMaterialItems(nextMaterialItems)
    }

    if (!Object.is(serviceItemsRef.current, nextServiceItems)) {
      setServiceItems(nextServiceItems)
    }
  }, [record, setMaterialItems, setServiceItems])

  const publishCollections = useCallback(
    (
      kind: LineItemMutationKind,
      action: LineItemMutationAction,
      nextMaterialItems: TMaterialItem[],
      nextServiceItems: TServiceItem[],
    ) => {
      const currentRecord = recordRef.current
      if (!currentRecord) {
        return
      }

      onCollectionsChangedRef.current({
        record: currentRecord,
        materialItems: nextMaterialItems,
        serviceItems: nextServiceItems,
        kind,
        action,
      })
    },
    [],
  )

  function clearMutationState() {
    clearParentError()
    notices.clearNotices()
  }

  function handleMaterialDraftChange(field: keyof MaterialItemDraft, value: string) {
    setMaterialDraft((previous) => ({ ...previous, [field]: value }))
    if (field === "productId" || field === "quantity" || field === "unitPrice") {
      setMaterialDraftErrors((previous) => clearFieldError(previous, field))
    }
  }

  function handleMaterialItemFieldChange(itemId: string, field: keyof EditableMaterialItem, value: string) {
    materialCollection.setItems((previous) =>
      previous.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    )

    if (field === "productId" || field === "quantity" || field === "unitPrice") {
      setMaterialItemErrors((previous) => clearRowFieldError(previous, itemId, field))
    }
  }

  async function addMaterialItem() {
    if (!recordRef.current) {
      return false
    }

    clearMutationState()
    const validationErrors = validateMaterialItemFields(materialDraft)
    if (Object.keys(validationErrors).length > 0) {
      setMaterialDraftErrors(validationErrors)
      notices.showError("Fix the highlighted material item fields before adding.")
      return false
    }

    try {
      const nextMaterialItems = await materialCollection.createItem(materialDraft)
      setMaterialDraft(initialMaterialDraft)
      setMaterialDraftErrors({})
      publishCollections("material", "add", nextMaterialItems, serviceItemsRef.current)
      notices.showSuccess("Material item added")
      return true
    } catch (error) {
      const fieldError = getRequestFieldError(error)
      if (fieldError.field === "productId" || fieldError.field === "quantity" || fieldError.field === "unitPrice") {
        const field = fieldError.field
        setMaterialDraftErrors(setFieldError(field, fieldError.message))
      }
      notices.showError(fieldError.message || "Failed to add material item")
      return false
    }
  }

  async function saveMaterialItem(item: EditableMaterialItem) {
    if (!recordRef.current) {
      return false
    }

    clearMutationState()
    const validationErrors = validateMaterialItemFields(item)
    if (Object.keys(validationErrors).length > 0) {
      setMaterialItemErrors((previous) => setRowFieldErrors(previous, item.id, validationErrors))
      notices.showError("Fix the highlighted material item fields before saving.")
      return false
    }

    try {
      const nextMaterialItems = await materialCollection.updateItem(item.id, item)
      setMaterialItemErrors((previous) => setRowFieldErrors(previous, item.id, {}))
      publishCollections("material", "save", nextMaterialItems, serviceItemsRef.current)
      notices.showSuccess("Material item saved")
      return true
    } catch (error) {
      const fieldError = getRequestFieldError(error)
      if (fieldError.field === "productId" || fieldError.field === "quantity" || fieldError.field === "unitPrice") {
        const field = fieldError.field
        setMaterialItemErrors((previous) =>
          setRowFieldErrors(previous, item.id, setFieldError(field, fieldError.message)),
        )
      }
      notices.showError(fieldError.message || "Failed to save material item")
      return false
    }
  }

  async function deleteMaterialItem(itemId: string) {
    if (!recordRef.current) {
      return
    }

    if (!confirmRecordDelete(buildDeleteConfirmationMessage("material item"))) {
      return
    }

    clearMutationState()
    try {
      const nextMaterialItems = await materialCollection.deleteItem(itemId)
      setMaterialItemErrors((previous) => setRowFieldErrors(previous, itemId, {}))
      publishCollections("material", "delete", nextMaterialItems, serviceItemsRef.current)
      notices.showSuccess("Material item deleted")
    } catch (error) {
      const fieldError = getRequestFieldError(error)
      notices.showError(fieldError.message || "Failed to delete material item")
    }
  }

  function handleServiceDraftChange(field: keyof ServiceItemDraft, value: string) {
    setServiceDraft((previous) => ({ ...previous, [field]: value }))
    if (field === "name" || field === "unitId" || field === "quantity" || field === "unitPrice") {
      setServiceDraftErrors((previous) => clearFieldError(previous, field))
    }
  }

  function handleServiceItemFieldChange(itemId: string, field: keyof EditableServiceItem, value: string) {
    serviceCollection.setItems((previous) =>
      previous.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    )

    if (field === "name" || field === "unitId" || field === "quantity" || field === "unitPrice") {
      setServiceItemErrors((previous) => clearRowFieldError(previous, itemId, field))
    }
  }

  async function addServiceItem() {
    if (!recordRef.current) {
      return false
    }

    clearMutationState()
    const validationErrors = validateServiceItemFields(serviceDraft)
    if (Object.keys(validationErrors).length > 0) {
      setServiceDraftErrors(validationErrors)
      notices.showError("Fix the highlighted service item fields before adding.")
      return false
    }

    try {
      const nextServiceItems = await serviceCollection.createItem(serviceDraft)
      setServiceDraft(initialServiceDraft)
      setServiceDraftErrors({})
      publishCollections("service", "add", materialItemsRef.current, nextServiceItems)
      notices.showSuccess("Service item added")
      return true
    } catch (error) {
      const fieldError = getRequestFieldError(error)
      if (fieldError.field === "name" || fieldError.field === "unitId" || fieldError.field === "quantity" || fieldError.field === "unitPrice") {
        const field = fieldError.field
        setServiceDraftErrors(setFieldError(field, fieldError.message))
      }
      notices.showError(fieldError.message || "Failed to add service item")
      return false
    }
  }

  async function saveServiceItem(item: EditableServiceItem) {
    if (!recordRef.current) {
      return
    }

    clearMutationState()
    const validationErrors = validateServiceItemFields(item)
    if (Object.keys(validationErrors).length > 0) {
      setServiceItemErrors((previous) => setRowFieldErrors(previous, item.id, validationErrors))
      notices.showError("Fix the highlighted service item fields before saving.")
      return
    }

    try {
      const nextServiceItems = await serviceCollection.updateItem(item.id, item)
      setServiceItemErrors((previous) => setRowFieldErrors(previous, item.id, {}))
      publishCollections("service", "save", materialItemsRef.current, nextServiceItems)
      notices.showSuccess("Service item saved")
    } catch (error) {
      const fieldError = getRequestFieldError(error)
      if (fieldError.field === "name" || fieldError.field === "unitId" || fieldError.field === "quantity" || fieldError.field === "unitPrice") {
        const field = fieldError.field
        setServiceItemErrors((previous) =>
          setRowFieldErrors(previous, item.id, setFieldError(field, fieldError.message)),
        )
      }
      notices.showError(fieldError.message || "Failed to save service item")
    }
  }

  async function deleteServiceItem(itemId: string) {
    if (!recordRef.current) {
      return
    }

    if (!confirmRecordDelete(buildDeleteConfirmationMessage("service item"))) {
      return
    }

    clearMutationState()
    try {
      const nextServiceItems = await serviceCollection.deleteItem(itemId)
      setServiceItemErrors((previous) => setRowFieldErrors(previous, itemId, {}))
      publishCollections("service", "delete", materialItemsRef.current, nextServiceItems)
      notices.showSuccess("Service item deleted")
    } catch (error) {
      const fieldError = getRequestFieldError(error)
      notices.showError(fieldError.message || "Failed to delete service item")
    }
  }

  return {
    materialDraft,
    setMaterialDraft,
    materialDraftErrors,
    materialItemErrors,
    materialItems: materialCollection.items,
    setMaterialItems: materialCollection.setItems,
    materialCollection,
    handleMaterialDraftChange,
    handleMaterialItemFieldChange,
    addMaterialItem,
    saveMaterialItem,
    deleteMaterialItem,
    serviceDraft,
    setServiceDraft,
    serviceDraftErrors,
    serviceItemErrors,
    serviceItems: serviceCollection.items,
    setServiceItems: serviceCollection.setItems,
    serviceCollection,
    handleServiceDraftChange,
    handleServiceItemFieldChange,
    addServiceItem,
    saveServiceItem,
    deleteServiceItem,
  }
}
