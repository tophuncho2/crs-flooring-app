"use client"

import { useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { useRecordDetailController } from "@/features/flooring/shared/controllers/record-page/use-record-detail-controller"
import type { RecordNotices } from "@/features/flooring/shared/controllers/record-page/use-record-notices"
import { normalizeAddressState } from "@/features/flooring/shared/domain/address-helpers"

export type ManagementCompanyPropertyRow = {
  id: string
  name: string
  fullAddress: string
}

export type ManagementCompanyDetailRecord = {
  id: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  properties: ManagementCompanyPropertyRow[]
  updatedAt: string
}

export type ManagementCompanyDraft = {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
}

export type ManagementCompanyPropertyDraft = {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  managementCompanyId: string
}

const defaultPropertyDraft: ManagementCompanyPropertyDraft = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  managementCompanyId: "",
}

function createCompanyDraft(company: ManagementCompanyDetailRecord): ManagementCompanyDraft {
  return {
    name: company.name,
    streetAddress: company.streetAddress,
    city: company.city,
    state: company.state,
    zip: company.zip,
    phone: company.phone,
    email: company.email,
  }
}

export function useManagementCompanyRecordController({
  initialCompany,
  notices,
  onDeleted,
}: {
  initialCompany: ManagementCompanyDetailRecord
  notices: RecordNotices
  onDeleted: () => void
}) {
  const {
    record,
    draft,
    setDraft,
    loading,
    error,
    syncRecord,
    clearRecordCache,
    isDirty,
  } = useRecordDetailController<ManagementCompanyDetailRecord, ManagementCompanyDraft>({
    scope: "management-company",
    id: initialCompany.id,
    initialRecord: initialCompany,
    toDraft: createCompanyDraft,
    url: `/api/flooring/management-companies/${initialCompany.id}`,
    payloadKey: "managementCompany",
  })

  const [isSaving, setIsSaving] = useState(false)
  const [isPropertyCreateOpen, setIsPropertyCreateOpen] = useState(false)
  const [isCreatingProperty, setIsCreatingProperty] = useState(false)
  const [propertyDraft, setPropertyDraft] = useState<ManagementCompanyPropertyDraft>({
    ...defaultPropertyDraft,
    managementCompanyId: initialCompany.id,
  })

  const currentCompany = record ?? initialCompany
  const currentDraft = draft ?? createCompanyDraft(currentCompany)

  function setDraftField(field: keyof ManagementCompanyDraft, value: string) {
    const normalizedValue = field === "state" ? normalizeAddressState(value) : value
    setDraft((previous) => ({ ...(previous ?? currentDraft), [field]: normalizedValue }))
  }

  function setPropertyDraftField(field: keyof ManagementCompanyPropertyDraft, value: string) {
    const normalizedValue = field === "state" ? normalizeAddressState(value) : value
    setPropertyDraft((previous) => ({ ...previous, [field]: normalizedValue }))
  }

  function toggleCreateProperty() {
    notices.clearNotices()
    setPropertyDraft({ ...defaultPropertyDraft, managementCompanyId: currentCompany.id })
    setIsPropertyCreateOpen((previous) => !previous)
  }

  function cancelCreateProperty() {
    setIsPropertyCreateOpen(false)
  }

  async function saveCompany() {
    notices.clearNotices()
    setIsSaving(true)

    try {
      if (!currentDraft.name.trim()) {
        throw new Error("Company name is required")
      }

      const payload = await requestJson<{ managementCompany?: ManagementCompanyDetailRecord }>(
        `/api/flooring/management-companies/${currentCompany.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: currentDraft.name,
            streetAddress: currentDraft.streetAddress,
            city: currentDraft.city,
            state: currentDraft.state,
            zip: currentDraft.zip,
            phone: currentDraft.phone,
            email: currentDraft.email,
          }),
        },
      )

      if (!payload.managementCompany) {
        throw new Error("Failed to save management company")
      }

      syncRecord(payload.managementCompany)
      notices.showSuccess("Management company saved")
    } catch (saveError) {
      notices.showError(saveError instanceof Error ? saveError.message : "Failed to save management company")
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteCompany() {
    notices.clearNotices()
    setIsSaving(true)

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/management-companies/${currentCompany.id}`, { method: "DELETE" })
      clearRecordCache()
      onDeleted()
    } catch (deleteError) {
      notices.showError(deleteError instanceof Error ? deleteError.message : "Failed to delete company")
      setIsSaving(false)
    }
  }

  async function createProperty() {
    notices.clearNotices()
    setIsCreatingProperty(true)

    try {
      if (!propertyDraft.name.trim()) {
        throw new Error("Property name is required")
      }

      const payload = await requestJson<{
        property?: {
          id: string
          name: string
          fullAddress: string
        }
      }>("/api/flooring/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: propertyDraft.name,
          streetAddress: propertyDraft.streetAddress,
          city: propertyDraft.city,
          state: propertyDraft.state,
          postalCode: propertyDraft.zip,
          phone: propertyDraft.phone,
          email: propertyDraft.email,
          managementCompanyId: currentCompany.id,
        }),
      })

      if (!payload.property) {
        throw new Error("Failed to create property")
      }

      syncRecord(
        {
          ...currentCompany,
          properties: [
            {
              id: payload.property.id,
              name: payload.property.name,
              fullAddress: payload.property.fullAddress,
            },
            ...currentCompany.properties,
          ],
        },
        { syncDraft: false },
      )

      setPropertyDraft({ ...defaultPropertyDraft, managementCompanyId: currentCompany.id })
      setIsPropertyCreateOpen(false)
      return payload.property.id
    } catch (createError) {
      notices.showError(createError instanceof Error ? createError.message : "Failed to create property")
      return null
    } finally {
      setIsCreatingProperty(false)
    }
  }

  return {
    company: currentCompany,
    draft: currentDraft,
    loading,
    error,
    isDirty,
    isSaving,
    isPropertyCreateOpen,
    propertyDraft,
    isCreatingProperty,
    setDraftField,
    setPropertyDraftField,
    toggleCreateProperty,
    cancelCreateProperty,
    saveCompany,
    deleteCompany,
    createProperty,
  }
}
