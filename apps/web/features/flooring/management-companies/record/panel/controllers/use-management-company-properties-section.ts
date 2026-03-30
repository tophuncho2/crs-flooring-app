"use client"

import { createLocalRecordRowId, createRecordSectionError, useRecordSectionController } from "@/features/shared/engines/record-view"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { normalizeAddressState } from "@/features/flooring/shared/domain/address-helpers"
import type { ManagementCompanyDetail, ManagementCompanyPropertyRow } from "../../../domain/types"

export type ManagementCompanyPropertyDraft = {
  id: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
}

function createEmptyPropertyDraft(): ManagementCompanyPropertyDraft {
  return {
    id: createLocalRecordRowId("management-company-property"),
    name: "",
    streetAddress: "",
    city: "",
    state: "",
    zip: "",
  }
}

function createPropertiesRevisionKey(company: ManagementCompanyDetail) {
  return company.properties.map((property) => `${property.id}:${property.templateCount}`).join("|")
}

function toManagementCompanyPropertyRow(property: {
  id: string
  name: string
  fullAddress: string
  templates: Array<{ id: string; templateTag: string; warehouseName: string; itemsCount: number }>
}): ManagementCompanyPropertyRow {
  return {
    id: property.id,
    name: property.name,
    fullAddress: property.fullAddress,
    templates: property.templates,
    templateCount: property.templates.length,
  }
}

export function useManagementCompanyPropertiesSection({
  record,
  publishRecord,
}: {
  record: ManagementCompanyDetail
  publishRecord: (record: ManagementCompanyDetail) => void
}) {
  const section = useRecordSectionController<ManagementCompanyDetail, ManagementCompanyPropertyDraft | null>({
    serverValue: record,
    serverRevisionKey: createPropertiesRevisionKey(record),
    createLocalValue: () => null,
    onSave: async (draft, currentRecord) => {
      if (!draft) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Add a property row before saving.",
          retryable: true,
        })
      }

      if (!draft.name.trim()) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Property name is required.",
          retryable: true,
        })
      }

      const payload = await requestJson<{
        property: {
          id: string
          name: string
          fullAddress: string
          templates: Array<{ id: string; templateTag: string; warehouseName: string; itemsCount: number }>
        }
      }>("/api/flooring/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managementCompanyId: currentRecord.id,
          name: draft.name,
          streetAddress: draft.streetAddress,
          city: draft.city,
          state: draft.state,
          zip: draft.zip,
        }),
      })

      const nextRecord: ManagementCompanyDetail = {
        ...currentRecord,
        properties: [toManagementCompanyPropertyRow(payload.property), ...currentRecord.properties],
      }

      publishRecord(nextRecord)

      return {
        serverValue: nextRecord,
        serverRevisionKey: createPropertiesRevisionKey(nextRecord),
        noticeMessage: "Property created. Open the row to continue editing.",
      }
    },
  })

  function addDraft() {
    if (section.localValue) {
      return
    }

    section.setLocalValue(createEmptyPropertyDraft())
    section.setError(null)
  }

  function setDraftField(field: keyof Omit<ManagementCompanyPropertyDraft, "id">, value: string) {
    section.setLocalValue((previous) =>
      previous
        ? {
            ...previous,
            [field]: field === "state" ? normalizeAddressState(value) : value,
          }
        : previous,
    )

    if (section.error) {
      section.setError(null)
    }
  }

  return {
    ...section,
    addDraft,
    setDraftField,
    canAddDraft: !section.localValue && !section.isSaving,
  }
}
