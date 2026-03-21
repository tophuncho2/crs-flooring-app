"use client"

import { useMemo, useState } from "react"
import { getClientErrorMessage } from "@/features/flooring/shared/client-errors"
import { requestJson } from "@/features/flooring/shared/http"
import { useRecordNotices } from "@/features/flooring/shared/use-record-notices"
import type { DraftWorkOrder, PropertyOption, TemplateOption, WorkOrderRow } from "./types"

const defaultDraft: DraftWorkOrder = {
  propertyId: "",
  templateId: "",
  warehouseId: "",
  status: "BUILDING_ORDER",
  isComplete: false,
  vacancy: "",
  date: "",
  unitText: "",
  unitNumber: "",
  unitType: "",
  customAddress: "",
  instructions: "",
  notes: "",
  workOrderImageUrl: "",
}

type WorkOrderPayload = {
  workOrder?: WorkOrderRow
}

export function useWorkOrdersClientController({
  initialRows,
  propertyOptions,
  templateOptions,
}: {
  initialRows: WorkOrderRow[]
  propertyOptions: PropertyOption[]
  templateOptions: TemplateOption[]
}) {
  const [rows, setRows] = useState(initialRows)
  const [createDraft, setCreateDraft] = useState<DraftWorkOrder>(defaultDraft)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSavingCreate, setIsSavingCreate] = useState(false)
  const [syncPropertyId, setSyncPropertyId] = useState("")
  const [syncTemplateSearch, setSyncTemplateSearch] = useState("")
  const [selectedSyncTemplateId, setSelectedSyncTemplateId] = useState("")
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [isCreatingFromTemplate, setIsCreatingFromTemplate] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const notices = useRecordNotices()

  const selectedAddress = useMemo(() => {
    if (createDraft.customAddress.trim()) {
      return createDraft.customAddress
    }

    return propertyOptions.find((property) => property.id === createDraft.propertyId)?.address ?? ""
  }, [createDraft.customAddress, createDraft.propertyId, propertyOptions])

  const filteredSyncTemplates = useMemo(() => {
    const normalizedSearch = syncTemplateSearch.trim().toLowerCase()

    return templateOptions.filter((template) => {
      if (!syncPropertyId || template.propertyId !== syncPropertyId) {
        return false
      }

      return !normalizedSearch || template.label.toLowerCase().includes(normalizedSearch)
    })
  }, [syncPropertyId, syncTemplateSearch, templateOptions])

  function updateCreateDraft(field: keyof DraftWorkOrder, value: string | boolean) {
    setCreateDraft((previous) => ({ ...previous, [field]: value }))
  }

  function resetTemplateCreateFlow() {
    setSyncPropertyId("")
    setSyncTemplateSearch("")
    setSelectedSyncTemplateId("")
  }

  function openCreateModal() {
    notices.clearNotices()
    setCreateDraft(defaultDraft)
    setIsCreateModalOpen(true)
  }

  function closeCreateModal() {
    if (isSavingCreate) {
      return
    }

    setIsCreateModalOpen(false)
  }

  function openSyncModal() {
    notices.clearNotices()
    resetTemplateCreateFlow()
    setIsSyncModalOpen(true)
  }

  function closeSyncModal() {
    if (isCreatingFromTemplate) {
      return
    }

    setIsSyncModalOpen(false)
  }

  function setSyncProperty(propertyId: string) {
    setSyncPropertyId(propertyId)
    setSelectedSyncTemplateId("")
    setSyncTemplateSearch("")
  }

  async function createWorkOrder() {
    notices.clearNotices()
    setIsSavingCreate(true)

    try {
      if (!createDraft.propertyId) {
        throw new Error("Property is required")
      }

      const payload = await requestJson<WorkOrderPayload>("/api/flooring/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createDraft),
      })

      if (!payload.workOrder) {
        throw new Error("Failed to create work order")
      }

      setRows((previous) => [payload.workOrder!, ...previous])
      setCreateDraft(defaultDraft)
      setIsCreateModalOpen(false)
      notices.showSuccess("Work order created")
      return payload.workOrder
    } catch (error) {
      notices.showError(getClientErrorMessage(error, "Failed to create work order"))
      return null
    } finally {
      setIsSavingCreate(false)
    }
  }

  async function createWorkOrderFromTemplate() {
    notices.clearNotices()
    setIsCreatingFromTemplate(true)

    try {
      if (!syncPropertyId) {
        throw new Error("Property is required")
      }

      if (!selectedSyncTemplateId) {
        throw new Error("Template is required")
      }

      const payload = await requestJson<WorkOrderPayload>("/api/flooring/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...defaultDraft,
          propertyId: syncPropertyId,
          templateId: selectedSyncTemplateId,
        }),
      })

      if (!payload.workOrder) {
        throw new Error("Failed to create work order from template")
      }

      setRows((previous) => [payload.workOrder!, ...previous])
      setIsSyncModalOpen(false)
      resetTemplateCreateFlow()
      notices.showSuccess("Work order created from template")
      return payload.workOrder
    } catch (error) {
      notices.showError(getClientErrorMessage(error, "Failed to create work order from template"))
      return null
    } finally {
      setIsCreatingFromTemplate(false)
    }
  }

  async function deleteWorkOrder(id: string) {
    notices.clearNotices()
    setDeletingId(id)

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/work-orders/${id}`, {
        method: "DELETE",
      })

      setRows((previous) => previous.filter((row) => row.id !== id))
      notices.showSuccess("Work order deleted")
      return true
    } catch (error) {
      notices.showError(getClientErrorMessage(error, "Failed to delete work order"))
      return false
    } finally {
      setDeletingId(null)
    }
  }

  return {
    rows,
    createDraft,
    deletingId,
    filteredSyncTemplates,
    isCreateModalOpen,
    isCreatingFromTemplate,
    isSavingCreate,
    isSyncModalOpen,
    notices,
    selectedAddress,
    selectedSyncTemplateId,
    syncPropertyId,
    syncTemplateSearch,
    updateCreateDraft,
    openCreateModal,
    closeCreateModal,
    createWorkOrder,
    openSyncModal,
    closeSyncModal,
    createWorkOrderFromTemplate,
    deleteWorkOrder,
    setSelectedSyncTemplateId,
    setSyncProperty,
    setSyncTemplateSearch,
  }
}
