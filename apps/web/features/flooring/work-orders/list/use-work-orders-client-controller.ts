"use client"

import { useMemo, useState } from "react"
import { getClientErrorMessage } from "@/features/flooring/shared/transport/client-errors"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import { useRecordNotices } from "@/features/shared/engines/record-view"
import type { PropertyOption, TemplateOption, WorkOrderRow } from "../types"

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
  const [syncPropertyId, setSyncPropertyId] = useState("")
  const [syncTemplateSearch, setSyncTemplateSearch] = useState("")
  const [selectedSyncTemplateId, setSelectedSyncTemplateId] = useState("")
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [isCreatingFromTemplate, setIsCreatingFromTemplate] = useState(false)
  const notices = useRecordNotices()

  const filteredSyncTemplates = useMemo(() => {
    const normalizedSearch = syncTemplateSearch.trim().toLowerCase()

    return templateOptions.filter((template) => {
      if (!syncPropertyId || template.propertyId !== syncPropertyId) {
        return false
      }

      return !normalizedSearch || template.label.toLowerCase().includes(normalizedSearch)
    })
  }, [syncPropertyId, syncTemplateSearch, templateOptions])

  function resetTemplateCreateFlow() {
    setSyncPropertyId("")
    setSyncTemplateSearch("")
    setSelectedSyncTemplateId("")
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
        body: JSON.stringify(
          withMutationMeta({
            propertyId: syncPropertyId,
            templateId: selectedSyncTemplateId,
            warehouseId: "",
            status: "BUILDING_ORDER",
            isComplete: false,
            vacancy: "",
            date: "",
            unitText: "",
            customAddress: "",
            instructions: "",
            notes: "",
            workOrderImageUrl: "",
          }),
        ),
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

  return {
    rows,
    filteredSyncTemplates,
    isCreatingFromTemplate,
    isSyncModalOpen,
    notices,
    selectedSyncTemplateId,
    syncPropertyId,
    syncTemplateSearch,
    openSyncModal,
    closeSyncModal,
    createWorkOrderFromTemplate,
    setSelectedSyncTemplateId,
    setSyncProperty,
    setSyncTemplateSearch,
  }
}
