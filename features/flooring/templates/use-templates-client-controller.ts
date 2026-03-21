"use client"

import { useState } from "react"
import { getClientErrorMessage } from "@/features/flooring/shared/client-errors"
import { requestJson } from "@/features/flooring/shared/http"
import { confirmRecordDelete } from "@/features/flooring/shared/record-panel-footer"
import { useRecordNotices } from "@/features/flooring/shared/use-record-notices"
import type { DraftTemplate, TemplateRow } from "./types"

const defaultDraft: DraftTemplate = {
  templateTag: "",
  propertyId: "",
  warehouseId: "",
  instructions: "",
  templateNotes: "",
  padProductId: "",
}

type TemplatePayload = {
  template?: TemplateRow
}

export function useTemplatesClientController(initialTemplates: TemplateRow[]) {
  const [rows, setRows] = useState<TemplateRow[]>(initialTemplates)
  const [createDraft, setCreateDraft] = useState<DraftTemplate>(defaultDraft)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSavingCreate, setIsSavingCreate] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const notices = useRecordNotices()

  function updateCreateDraft(field: keyof DraftTemplate, value: string) {
    setCreateDraft((previous) => ({ ...previous, [field]: value }))
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

  async function createTemplate() {
    notices.clearNotices()
    setIsSavingCreate(true)

    try {
      if (!createDraft.propertyId) {
        throw new Error("Property is required")
      }

      if (!createDraft.templateTag.trim()) {
        throw new Error("Template tag is required")
      }

      const payload = await requestJson<TemplatePayload>("/api/flooring/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createDraft,
          warehouseId: createDraft.warehouseId || null,
          padProductId: createDraft.padProductId || null,
        }),
      })

      if (!payload.template) {
        throw new Error("Failed to create template")
      }

      setRows((previous) => [payload.template!, ...previous])
      setCreateDraft(defaultDraft)
      setIsCreateModalOpen(false)
      notices.showSuccess("Template created")
      return payload.template
    } catch (error) {
      notices.showError(getClientErrorMessage(error, "Failed to create template"))
      return null
    } finally {
      setIsSavingCreate(false)
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirmRecordDelete("Delete this template? This cannot be undone.")) {
      return false
    }

    notices.clearNotices()
    setDeletingId(id)

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/templates/${id}`, { method: "DELETE" })
      setRows((previous) => previous.filter((template) => template.id !== id))
      notices.showSuccess("Template deleted")
      return true
    } catch (error) {
      notices.showError(getClientErrorMessage(error, "Failed to delete template"))
      return false
    } finally {
      setDeletingId(null)
    }
  }

  return {
    rows,
    createDraft,
    deletingId,
    isCreateModalOpen,
    isSavingCreate,
    notices,
    updateCreateDraft,
    openCreateModal,
    closeCreateModal,
    createTemplate,
    deleteTemplate,
  }
}
