"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { buildCanonicalDetailHref, buildCurrentPath } from "@/features/flooring/shared/record-page/detail-routes"
import { RecordDetailPageShell } from "@/features/flooring/shared/record-page/record-detail-page-shell"
import { useUnsavedChangesGuard } from "@/features/flooring/shared/record-page/use-unsaved-changes-guard"
import { buildFullAddress, normalizeAddressState } from "@/features/flooring/shared/utils/address-helpers"
import { ManagementCompanyRecordPanel } from "./management-company-record-panel"

type ManagementCompanyRow = {
  id: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  properties: { id: string; name: string; fullAddress: string }[]
}

type DraftCompany = {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
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

const defaultPropertyDraft: DraftProperty = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  managementCompanyId: "",
}

function createCompanyDraft(company: ManagementCompanyRow): DraftCompany {
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

export function ManagementCompanyDetailClient({
  company: initialCompany,
  backHref,
}: {
  company: ManagementCompanyRow
  backHref: string
}) {
  const router = useRouter()
  const [company, setCompany] = useState(initialCompany)
  const [draft, setDraft] = useState<DraftCompany>(createCompanyDraft(initialCompany))
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isPropertyCreateOpen, setIsPropertyCreateOpen] = useState(false)
  const [isCreatingProperty, setIsCreatingProperty] = useState(false)
  const [propertyDraft, setPropertyDraft] = useState<DraftProperty>({
    ...defaultPropertyDraft,
    managementCompanyId: initialCompany.id,
  })

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(createCompanyDraft(company)),
    [company, draft],
  )
  const guard = useUnsavedChangesGuard({
    isDirty,
    message: "You have unsaved management company changes. Leave this company without saving?",
  })

  const closePage = useCallback(() => {
    guard.confirmNavigation(() => {
      router.push(backHref, { scroll: false })
    })
  }, [backHref, guard, router])

  function setDraftField(field: keyof DraftCompany, value: string) {
    const normalizedValue = field === "state" ? normalizeAddressState(value) : value
    setDraft((prev) => ({ ...prev, [field]: normalizedValue }))
  }

  function setPropertyDraftField(field: keyof DraftProperty, value: string) {
    const normalizedValue = field === "state" ? normalizeAddressState(value) : value
    setPropertyDraft((prev) => ({ ...prev, [field]: normalizedValue }))
  }

  function navigateToProperty(propertyId: string) {
    const currentPath = buildCurrentPath(window.location.pathname, new URLSearchParams(window.location.search))
    guard.confirmNavigation(() => {
      router.push(buildCanonicalDetailHref("/dashboard/flooring/properties", propertyId, currentPath), { scroll: false })
    })
  }

  async function saveCompany() {
    setMessage("")
    setError("")
    setIsSaving(true)

    try {
      if (!draft.name.trim()) {
        throw new Error("Company name is required")
      }

      const payload = await requestJson<{
        managementCompany?: {
          id: string
          name: string
          streetAddress?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          postalCode?: string | null
          phone?: string | null
          email?: string | null
          fullAddress?: string
          properties?: ManagementCompanyRow["properties"]
        }
      }>(`/api/flooring/management-companies/${company.id}`, {
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
        }),
      })

      if (!payload.managementCompany) {
        throw new Error("Failed to save management company")
      }

      const updatedCompany: ManagementCompanyRow = {
        id: payload.managementCompany.id,
        name: payload.managementCompany.name,
        streetAddress: payload.managementCompany.streetAddress ?? "",
        city: payload.managementCompany.city ?? "",
        state: payload.managementCompany.state ?? "",
        zip: payload.managementCompany.zip ?? payload.managementCompany.postalCode ?? "",
        phone: payload.managementCompany.phone ?? "",
        email: payload.managementCompany.email ?? "",
        fullAddress:
          payload.managementCompany.fullAddress ??
          buildFullAddress({
            streetAddress: payload.managementCompany.streetAddress ?? "",
            city: payload.managementCompany.city ?? "",
            state: payload.managementCompany.state ?? "",
            zip: payload.managementCompany.zip ?? payload.managementCompany.postalCode ?? "",
          }),
        properties: payload.managementCompany.properties ?? company.properties,
      }

      setCompany(updatedCompany)
      setDraft(createCompanyDraft(updatedCompany))
      setMessage("Management company saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save management company")
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteCompany() {
    setMessage("")
    setError("")
    setIsSaving(true)

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/management-companies/${company.id}`, { method: "DELETE" })
      router.push(backHref, { scroll: false })
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete company")
      setIsSaving(false)
    }
  }

  async function createProperty() {
    setMessage("")
    setError("")
    setIsCreatingProperty(true)

    try {
      if (!propertyDraft.name.trim()) {
        throw new Error("Property name is required")
      }

      const payload = await requestJson<{
        property?: {
          id: string
          name: string
          streetAddress?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          phone?: string | null
          email?: string | null
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
          managementCompanyId: company.id,
        }),
      })

      if (!payload.property) {
        throw new Error("Failed to create property")
      }

      const nextCompany = {
        ...company,
        properties: [
          {
            id: payload.property.id,
            name: payload.property.name,
            fullAddress: payload.property.fullAddress,
          },
          ...company.properties,
        ],
      }
      setCompany(nextCompany)
      setPropertyDraft({ ...defaultPropertyDraft, managementCompanyId: company.id })
      setIsPropertyCreateOpen(false)
      navigateToProperty(payload.property.id)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create property")
    } finally {
      setIsCreatingProperty(false)
    }
  }

  return (
    <RecordDetailPageShell title={company.name} backHref={backHref} onBack={closePage} sizeClass="max-w-6xl">
      <ManagementCompanyRecordPanel
        company={{
          ...company,
          fullAddress: buildFullAddress({
            streetAddress: company.streetAddress,
            city: company.city,
            state: company.state,
            zip: company.zip,
          }),
        }}
        mode="edit"
        draft={draft}
        message={message}
        error={error}
        isPropertyCreateOpen={isPropertyCreateOpen}
        propertyDraft={propertyDraft}
        loadingPropertyId={null}
        isSaving={isSaving}
        onDraftChange={setDraftField}
        onSave={() => void saveCompany()}
        onDelete={() => void deleteCompany()}
        onClose={closePage}
        onPropertyDraftChange={setPropertyDraftField}
        onOpenProperty={(propertyId) => navigateToProperty(propertyId)}
        onOpenCreateProperty={() => {
          setMessage("")
          setError("")
          setPropertyDraft({ ...defaultPropertyDraft, managementCompanyId: company.id })
          setIsPropertyCreateOpen((prev) => !prev)
        }}
        onCancelCreateProperty={() => setIsPropertyCreateOpen(false)}
        onCreateProperty={() => void createProperty()}
        isCreatingProperty={isCreatingProperty}
      />
    </RecordDetailPageShell>
  )
}
