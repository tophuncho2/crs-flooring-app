"use client"

import { useMemo, useState } from "react"
import { useCanonicalDetailNavigation } from "@/features/flooring/shared/controllers/navigation/use-canonical-detail-navigation"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/flooring/shared/ui/table/confirm-delete"
import { requestJson } from "@/features/flooring/shared/transport/http"

export type ImportRow = {
  id: string
  importNumber: number
  orderNumber: string
  tag: string
  transportType: string
  status: string
  notes: string
  warehouseId: string
  warehouseName: string
  itemsCount: number
  createdAt: string
  updatedAt: string
  inventories: Array<{
    id: string
    productId: string
    productName: string
    stockUnit: string
    itemNumber: string
    dyeLot: string
    stockCount: string
    cost: string
    freight: string
    notes: string
    locationId: string
    locationCode: string
    warehouseId: string
    warehouseName: string
    sectionName: string
  }>
}

export type ProductOption = {
  id: string
  label: string
  stockUnit: string
}

export type WarehouseOption = {
  id: string
  name: string
}

export type LocationOption = {
  id: string
  warehouseId: string
  locationCode: string
  label: string
}

export type ImportItemDraft = {
  clientId: string
  productId: string
  itemNumber: string
  stockCount: string
  locationId: string
  dyeLot: string
  cost: string
  freight: string
  notes: string
}

export type ImportDraft = {
  orderNumber: string
  tag: string
  transportType: string
  status: string
  notes: string
  warehouseId: string
  items: ImportItemDraft[]
}

export type CreateImportValidation = {
  warehouseId: boolean
  items: boolean
  itemFields: Record<string, { productId: boolean; stockCount: boolean }>
}

export function createEmptyItem(): ImportItemDraft {
  return {
    clientId: crypto.randomUUID(),
    productId: "",
    itemNumber: "",
    stockCount: "",
    locationId: "",
    dyeLot: "",
    cost: "",
    freight: "",
    notes: "",
  }
}

export function applyDefaultLocationToItem(item: ImportItemDraft, warehouseId: string, locationOptions: LocationOption[]) {
  const warehouseLocations = warehouseId ? locationOptions.filter((location) => location.warehouseId === warehouseId) : []
  const currentLocation = warehouseLocations.find((location) => location.id === item.locationId)

  if (currentLocation) {
    return item
  }

  return {
    ...item,
    locationId: "",
  }
}

export function createEmptyDraft(): ImportDraft {
  return {
    orderNumber: "",
    tag: "",
    transportType: "PURCHASE_ORDER",
    status: "PENDING",
    notes: "",
    warehouseId: "",
    items: [],
  }
}

export function validateCreateImportDraft(draft: ImportDraft): CreateImportValidation {
  const itemFields: CreateImportValidation["itemFields"] = {}

  for (const item of draft.items) {
    itemFields[item.clientId] = {
      productId: item.productId.trim() === "",
      stockCount: item.stockCount.trim() === "",
    }
  }

  return {
    warehouseId: draft.warehouseId.trim() === "",
    items: draft.items.length === 0,
    itemFields,
  }
}

export function hasCreateImportValidationErrors(validation: CreateImportValidation) {
  if (validation.warehouseId) return true
  if (validation.items) return true

  return Object.values(validation.itemFields).some((fields) => fields.productId || fields.stockCount)
}

export function useImportsListController({
  initialImports,
  productOptions,
  locationOptions,
}: {
  initialImports: ImportRow[]
  productOptions: ProductOption[]
  locationOptions: LocationOption[]
}) {
  const importNavigation = useCanonicalDetailNavigation("/dashboard/flooring/imports")
  const [imports, setImports] = useState(initialImports)
  const [draft, setDraft] = useState<ImportDraft>(() => createEmptyDraft())
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")
  const [createModalError, setCreateModalError] = useState("")
  const [createValidation, setCreateValidation] = useState<CreateImportValidation>(() => validateCreateImportDraft(createEmptyDraft()))

  function clearPageNotices() {
    setMessage("")
    setPageError("")
  }

  function openCreateModal() {
    clearPageNotices()
    setCreateModalError("")
    const emptyDraft = createEmptyDraft()
    setCreateValidation(validateCreateImportDraft(emptyDraft))
    setDraft(emptyDraft)
    setIsCreateModalOpen(true)
  }

  function closeCreateModal() {
    if (isSaving) return
    setIsCreateModalOpen(false)
  }

  function setDraftField(field: keyof Omit<ImportDraft, "items">, value: string) {
    setDraft((previous) => {
      const next =
        field === "warehouseId"
          ? {
              ...previous,
              warehouseId: value,
              items: previous.items.map((item) => applyDefaultLocationToItem(item, value, locationOptions)),
            }
          : { ...previous, [field]: value }
      setCreateValidation(validateCreateImportDraft(next))
      return next
    })
  }

  function setItemField(index: number, field: keyof ImportItemDraft, value: string) {
    setDraft((previous) => {
      const next = {
        ...previous,
        items: previous.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
      }
      setCreateValidation(validateCreateImportDraft(next))
      return next
    })
  }

  function addItemRow() {
    setDraft((previous) => {
      const nextItem = applyDefaultLocationToItem(createEmptyItem(), previous.warehouseId, locationOptions)
      const next = { ...previous, items: [...previous.items, nextItem] }
      setCreateValidation(validateCreateImportDraft(next))
      return next
    })
  }

  function removeItemRow(index: number) {
    setDraft((previous) => {
      const next = {
        ...previous,
        items: previous.items.filter((_, itemIndex) => itemIndex !== index),
      }
      setCreateValidation(validateCreateImportDraft(next))
      return next
    })
  }

  async function createImport() {
    clearPageNotices()
    setCreateModalError("")
    const nextValidation = validateCreateImportDraft(draft)
    setCreateValidation(nextValidation)

    if (hasCreateImportValidationErrors(nextValidation)) {
      setCreateModalError(
        nextValidation.items
          ? "Add at least one inventory row before creating the import"
          : "Fill the highlighted required fields before creating the import",
      )
      return
    }

    setIsSaving(true)

    try {
      const payload = await requestJson<{ import: ImportRow }>("/api/flooring/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })

      setImports((previous) => [payload.import, ...previous])
      const emptyDraft = createEmptyDraft()
      setDraft(emptyDraft)
      setCreateValidation(validateCreateImportDraft(emptyDraft))
      setIsCreateModalOpen(false)
      importNavigation.openRecord(payload.import.id)
    } catch (createError) {
      setCreateModalError(createError instanceof Error ? createError.message : "Failed to create import")
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteImport(id: string) {
    if (!confirmRecordDelete(buildDeleteConfirmationMessage("import"))) {
      return
    }

    clearPageNotices()
    setDeletingId(id)

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/imports/${id}`, { method: "DELETE" })
      setImports((previous) => previous.filter((row) => row.id !== id))
      setMessage("Import deleted")
    } catch (deleteError) {
      setPageError(deleteError instanceof Error ? deleteError.message : "Failed to delete import")
    } finally {
      setDeletingId(null)
    }
  }

  const productLookup = useMemo(
    () => new Map(productOptions.map((product) => [product.id, product])),
    [productOptions],
  )

  return {
    imports,
    draft,
    isCreateModalOpen,
    isSaving,
    deletingId,
    message,
    pageError,
    createModalError,
    createValidation,
    openCreateModal,
    closeCreateModal,
    setDraftField,
    setItemField,
    addItemRow,
    removeItemRow,
    createImport,
    deleteImport,
    openImport: importNavigation.openRecord,
    productLookup,
  }
}
