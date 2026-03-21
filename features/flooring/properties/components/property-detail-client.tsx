"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { requestJson } from "@/features/flooring/shared/http"
import { buildCanonicalDetailHref, buildCurrentPath } from "@/features/flooring/shared/detail-routes"
import { RecordDetailPageShell } from "@/features/flooring/shared/record-detail-page-shell"
import { useUnsavedChangesGuard } from "@/features/flooring/shared/use-unsaved-changes-guard"
import { buildFullAddress, normalizeAddressState } from "@/features/flooring/shared/address-helpers"
import { PropertyRecordPanel } from "./property-record-panel"

type PropertyManagementCompany = {
  id: string
  name: string
}

type PropertyRow = {
  id: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  managementCompany: PropertyManagementCompany | null
  templates: Array<{
    id: string
    templateTag: string
    warehouseName: string
    itemsCount: number
  }>
}

type DraftProperty = {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  managementCompanyId: string
}

type DraftTemplate = {
  templateTag: string
  propertyId: string
  warehouseId: string
  instructions: string
  templateNotes: string
  padProductId: string
}

const defaultTemplateDraft: DraftTemplate = {
  templateTag: "",
  propertyId: "",
  warehouseId: "",
  instructions: "",
  templateNotes: "",
  padProductId: "",
}

function createPropertyDraft(property: PropertyRow): DraftProperty {
  return {
    name: property.name,
    streetAddress: property.streetAddress,
    city: property.city,
    state: property.state,
    zip: property.zip,
    phone: property.phone,
    email: property.email,
    managementCompanyId: property.managementCompany?.id ?? "",
  }
}

export function PropertyDetailClient({
  property: initialProperty,
  managementOptions,
  warehouseOptions,
  padProductOptions,
  backHref,
}: {
  property: PropertyRow
  managementOptions: Array<{ id: string; name: string }>
  warehouseOptions: Array<{ id: string; name: string }>
  padProductOptions: Array<{ id: string; label: string }>
  backHref: string
}) {
  const router = useRouter()
  const [property, setProperty] = useState(initialProperty)
  const [draft, setDraft] = useState<DraftProperty>(createPropertyDraft(initialProperty))
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isTemplateCreateOpen, setIsTemplateCreateOpen] = useState(false)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const [newTemplateDraft, setNewTemplateDraft] = useState<DraftTemplate>({
    ...defaultTemplateDraft,
    propertyId: initialProperty.id,
  })

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(createPropertyDraft(property)),
    [draft, property],
  )
  const guard = useUnsavedChangesGuard({
    isDirty,
    message: "You have unsaved property changes. Leave this property without saving?",
  })

  const closePage = useCallback(() => {
    guard.confirmNavigation(() => {
      router.push(backHref, { scroll: false })
    })
  }, [backHref, guard, router])

  function setDraftField(field: keyof DraftProperty, value: string) {
    const normalizedValue = field === "state" ? normalizeAddressState(value) : value
    setDraft((prev) => ({ ...prev, [field]: normalizedValue }))
  }

  function setNewTemplateDraftField(field: keyof DraftTemplate, value: string) {
    setNewTemplateDraft((prev) => ({ ...prev, [field]: value }))
  }

  function navigateToTemplate(templateId: string) {
    const currentPath = buildCurrentPath(window.location.pathname, new URLSearchParams(window.location.search))
    guard.confirmNavigation(() => {
      router.push(buildCanonicalDetailHref("/dashboard/flooring/templates", templateId, currentPath), { scroll: false })
    })
  }

  async function saveProperty() {
    setMessage("")
    setError("")
    setIsSaving(true)

    try {
      if (!draft.name.trim()) {
        throw new Error("Property name is required")
      }

      const payload = await requestJson<{
        property?: Omit<PropertyRow, "zip" | "managementCompany" | "templates"> & {
          zip?: string
          postalCode?: string
          managementCompany?: PropertyManagementCompany | null
          templates?: PropertyRow["templates"]
        }
      }>(`/api/flooring/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          streetAddress: draft.streetAddress,
          city: draft.city,
          state: draft.state,
          zip: draft.zip,
          phone: draft.phone,
          email: draft.email,
          managementCompanyId: draft.managementCompanyId || null,
        }),
      })

      if (!payload.property) {
        throw new Error("Failed to save property")
      }

      const updatedProperty: PropertyRow = {
        id: payload.property.id,
        name: payload.property.name,
        streetAddress: payload.property.streetAddress ?? "",
        city: payload.property.city ?? "",
        state: payload.property.state ?? "",
        zip: payload.property.zip ?? payload.property.postalCode ?? "",
        phone: payload.property.phone ?? "",
        email: payload.property.email ?? "",
        fullAddress: payload.property.fullAddress,
        managementCompany:
          payload.property.managementCompany ??
          (draft.managementCompanyId
            ? managementOptions.find((option) => option.id === draft.managementCompanyId) ?? null
            : null),
        templates: payload.property.templates ?? property.templates,
      }

      setProperty(updatedProperty)
      setDraft(createPropertyDraft(updatedProperty))
      setMessage("Property saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save property")
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteProperty() {
    setMessage("")
    setError("")
    setIsSaving(true)

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/properties/${property.id}`, { method: "DELETE" })
      router.push(backHref, { scroll: false })
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete property")
      setIsSaving(false)
    }
  }

  async function createTemplate() {
    setMessage("")
    setError("")
    setIsCreatingTemplate(true)

    try {
      if (!newTemplateDraft.templateTag.trim()) {
        throw new Error("Template tag is required")
      }

      const payload = await requestJson<{
        template?: {
          id: string
          templateNumber: string
          templateTag: string
          propertyId: string
          propertyName: string
          warehouseId: string
          warehouseName: string
          instructions: string
          templateNotes: string
          padProductId: string
          padTypeLabel: string
          createdAt: string
          updatedAt: string
        }
      }>("/api/flooring/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newTemplateDraft,
          propertyId: property.id,
          warehouseId: newTemplateDraft.warehouseId || null,
          padProductId: newTemplateDraft.padProductId || null,
        }),
      })

      if (!payload.template) {
        throw new Error("Failed to create template")
      }

      const nextProperty = {
        ...property,
        templates: [
          {
            id: payload.template.id,
            templateTag: payload.template.templateTag,
            warehouseName: payload.template.warehouseName,
            itemsCount: 0,
          },
          ...property.templates,
        ],
      }
      setProperty(nextProperty)
      setIsTemplateCreateOpen(false)
      setNewTemplateDraft({ ...defaultTemplateDraft, propertyId: property.id })
      navigateToTemplate(payload.template.id)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create template")
    } finally {
      setIsCreatingTemplate(false)
    }
  }

  return (
    <RecordDetailPageShell title={property.name} backHref={backHref} onBack={closePage} sizeClass="max-w-6xl">
      <PropertyRecordPanel
        property={{
          ...property,
          fullAddress: buildFullAddress({
            streetAddress: property.streetAddress,
            city: property.city,
            state: property.state,
            zip: property.zip,
          }),
        }}
        mode="edit"
        draft={draft}
        managementOptions={managementOptions}
        message={message}
        error={error}
        isTemplateCreateOpen={isTemplateCreateOpen}
        newTemplateDraft={newTemplateDraft}
        warehouseOptions={warehouseOptions}
        padProductOptions={padProductOptions}
        loadingTemplate={false}
        isSaving={isSaving}
        onDraftChange={setDraftField}
        onSave={() => void saveProperty()}
        onDelete={() => void deleteProperty()}
        onClose={closePage}
        onTemplateDraftChange={setNewTemplateDraftField}
        onOpenTemplate={(templateId) => navigateToTemplate(templateId)}
        onOpenCreateTemplate={() => {
          setMessage("")
          setError("")
          setNewTemplateDraft({ ...defaultTemplateDraft, propertyId: property.id })
          setIsTemplateCreateOpen((prev) => !prev)
        }}
        onCancelCreateTemplate={() => setIsTemplateCreateOpen(false)}
        onCreateTemplate={() => void createTemplate()}
        isCreatingTemplate={isCreatingTemplate}
      />
    </RecordDetailPageShell>
  )
}
