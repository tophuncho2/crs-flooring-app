"use client"

import { type ReactNode, useState } from "react"
import { Plus, X } from "lucide-react"

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

type PropertyOption = {
  id: string
  name: string
}

type WarehouseOption = {
  id: string
  name: string
}

type PadProductOption = {
  id: string
  label: string
}

type ProductOption = {
  id: string
  label: string
  sendUnit: string
}

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

type TemplateRow = {
  id: string
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

type DraftTemplate = {
  templateTag: string
  propertyId: string
  warehouseId: string
  instructions: string
  templateNotes: string
  padProductId: string
}

type TemplateItem = {
  id: string
  productId: string
  productName: string
  sendUnit: string
  quantity: string
  notes: string
  storedDyeLot: string
  createdAt: string
}

type TemplateItemDraft = {
  productId: string
  quantity: string
  notes: string
  storedDyeLot: string
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

const defaultDraft: DraftCompany = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
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

const defaultTemplateDraft: DraftTemplate = {
  templateTag: "",
  propertyId: "",
  warehouseId: "",
  instructions: "",
  templateNotes: "",
  padProductId: "",
}

const emptyItemDraft: TemplateItemDraft = {
  productId: "",
  quantity: "",
  notes: "",
  storedDyeLot: "",
}

function normalizeState(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase()
}

function computeFullAddress(value: { streetAddress: string; city: string; state: string; zip: string }) {
  return [value.streetAddress, value.city, value.state, value.zip].filter(Boolean).join(", ")
}

function ModalShell({
  title,
  onClose,
  children,
  zIndexClass = "z-40",
}: {
  title: string
  onClose: () => void
  children: ReactNode
  zIndexClass?: string
}) {
  return (
    <div className={`fixed inset-0 ${zIndexClass} overflow-y-auto bg-black/50 p-4 pt-24 sm:p-6 sm:pt-28`}>
      <div className="flex min-h-full items-start justify-center">
        <div className="flex max-h-[calc(100vh-7rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-xl sm:max-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-5 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
            >
              <X size={18} />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[var(--foreground)]/80">{label}</span>
      {children}
    </label>
  )
}

export default function ManagementCompaniesClient({
  initialCompanies,
  propertyOptions,
  warehouseOptions,
  padProductOptions,
  productOptions,
}: {
  initialCompanies: ManagementCompanyRow[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  padProductOptions: PadProductOption[]
  productOptions: ProductOption[]
}) {
  const [companies, setCompanies] = useState<ManagementCompanyRow[]>(initialCompanies)
  const [propertySelectOptions, setPropertySelectOptions] = useState<PropertyOption[]>(propertyOptions)
  const [drafts, setDrafts] = useState<Record<string, DraftCompany>>({})
  const [newDraft, setNewDraft] = useState<DraftCompany>(defaultDraft)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [isSavingId, setIsSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [selectedCompany, setSelectedCompany] = useState<ManagementCompanyRow | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<PropertyRow | null>(null)
  const [isPropertyCreateOpen, setIsPropertyCreateOpen] = useState(false)
  const [propertyDraft, setPropertyDraft] = useState<DraftProperty>(defaultPropertyDraft)
  const [isCreatingProperty, setIsCreatingProperty] = useState(false)
  const [loadingPropertyId, setLoadingPropertyId] = useState<string | null>(null)
  const [activeTemplate, setActiveTemplate] = useState<TemplateRow | null>(null)
  const [activeTemplateDraft, setActiveTemplateDraft] = useState<DraftTemplate>(defaultTemplateDraft)
  const [isTemplateCreateOpen, setIsTemplateCreateOpen] = useState(false)
  const [newTemplateDraft, setNewTemplateDraft] = useState<DraftTemplate>(defaultTemplateDraft)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([])
  const [itemDraft, setItemDraft] = useState<TemplateItemDraft>(emptyItemDraft)
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [isSavingTemplateModal, setIsSavingTemplateModal] = useState(false)
  const [isSavingItem, setIsSavingItem] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  function getDraft(id: string): DraftCompany {
    if (drafts[id]) {
      return drafts[id]
    }

    const row = companies.find((company) => company.id === id)
    if (!row) {
      return defaultDraft
    }

    return {
      name: row.name,
      streetAddress: row.streetAddress,
      city: row.city,
      state: normalizeState(row.state),
      zip: row.zip,
      phone: row.phone,
      email: row.email,
    }
  }

  function setDraftField(id: string, field: keyof DraftCompany, value: string | string[]) {
    setDrafts((prev) => {
      const normalizedValue = field === "state" && typeof value === "string" ? normalizeState(value) : value
      const base = getDraft(id)
      return {
        ...prev,
        [id]: {
          ...base,
          [field]: normalizedValue,
        },
      }
    })
  }

  function setNewDraftField(field: keyof DraftCompany, value: string | string[]) {
    const normalizedValue = field === "state" && typeof value === "string" ? normalizeState(value) : value
    setNewDraft((prev) => ({ ...prev, [field]: normalizedValue }))
  }

  function setPropertyDraftField(field: keyof DraftProperty, value: string) {
    const normalizedValue = field === "state" ? normalizeState(value) : value
    setPropertyDraft((prev) => ({ ...prev, [field]: normalizedValue }))
  }

  function setNewTemplateDraftField(field: keyof DraftTemplate, value: string) {
    setNewTemplateDraft((prev) => ({ ...prev, [field]: value }))
  }

  function openCompany(company: ManagementCompanyRow) {
    setError("")
    setMessage("")
    setIsPropertyCreateOpen(false)
    setPropertyDraft({ ...defaultPropertyDraft, managementCompanyId: company.id })
    setSelectedCompany(company)
  }

  async function openProperty(propertyId: string) {
    setError("")
    setMessage("")
    setLoadingPropertyId(propertyId)

    try {
      const response = await fetch(`/api/properties-hub/${propertyId}`)
      const payload = (await response.json().catch(() => ({}))) as { error?: string; property?: PropertyRow }
      if (!response.ok || !payload.property) {
        throw new Error(payload.error ?? "Failed to load property")
      }

      setSelectedProperty({
        ...payload.property,
        streetAddress: payload.property.streetAddress ?? "",
        city: payload.property.city ?? "",
        state: payload.property.state ?? "",
        zip: payload.property.zip ?? "",
        phone: payload.property.phone ?? "",
        email: payload.property.email ?? "",
        templates: payload.property.templates ?? [],
      })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load property")
    } finally {
      setLoadingPropertyId(null)
    }
  }

  async function loadTemplateItems(templateId: string) {
    setLoadingItems(true)
    try {
      const response = await fetch(`/api/flooring/templates/${templateId}/items`)
      const payload = (await response.json().catch(() => ({}))) as { items?: TemplateItem[]; error?: string }
      if (!response.ok) throw new Error(payload.error ?? "Failed to load template items")
      setTemplateItems(payload.items ?? [])
      return payload.items ?? []
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load template items")
      setTemplateItems([])
      return []
    } finally {
      setLoadingItems(false)
    }
  }

  async function openTemplate(templateId: string) {
    setError("")
    setMessage("")
    setLoadingTemplate(true)

    try {
      const response = await fetch(`/api/flooring/templates/${templateId}`)
      const payload = (await response.json().catch(() => ({}))) as { error?: string; template?: TemplateRow }
      if (!response.ok || !payload.template) {
        throw new Error(payload.error ?? "Failed to load template")
      }

      setActiveTemplate(payload.template)
      setActiveTemplateDraft({
        templateTag: payload.template.templateTag,
        propertyId: payload.template.propertyId,
        warehouseId: payload.template.warehouseId,
        instructions: payload.template.instructions,
        templateNotes: payload.template.templateNotes,
        padProductId: payload.template.padProductId,
      })
      setItemDraft(emptyItemDraft)
      await loadTemplateItems(payload.template.id)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load template")
      setActiveTemplate(null)
    } finally {
      setLoadingTemplate(false)
    }
  }

  function closeTemplate() {
    if (isSavingTemplateModal || isSavingItem || deletingItemId) return
    setActiveTemplate(null)
    setActiveTemplateDraft(defaultTemplateDraft)
    setIsTemplateCreateOpen(false)
    setNewTemplateDraft(defaultTemplateDraft)
    setTemplateItems([])
    setItemDraft(emptyItemDraft)
  }

  function updateSelectedPropertyTemplateSummary(templateId: string, itemsCount: number, templateRow?: TemplateRow) {
    setSelectedProperty((prev) => {
      if (!prev) return prev
      const found = prev.templates.find((template) => template.id === templateId)
      const nextTemplate = templateRow
        ? {
            id: templateRow.id,
            templateTag: templateRow.templateTag,
            warehouseName: templateRow.warehouseName,
            itemsCount,
          }
        : found
          ? { ...found, itemsCount }
          : null

      if (!nextTemplate) return prev

      return {
        ...prev,
        templates: found ? prev.templates.map((template) => (template.id === templateId ? nextTemplate : template)) : [nextTemplate, ...prev.templates],
      }
    })
  }

  async function createPropertyForCompany() {
    if (!selectedCompany) return
    setError("")
    setMessage("")
    setIsCreatingProperty(true)

    try {
      if (!propertyDraft.name.trim()) throw new Error("Property name is required")

      const response = await fetch("/api/properties-hub", {
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
          managementCompanyId: selectedCompany.id,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        property?: Omit<PropertyRow, "templates" | "zip"> & { zip?: string; templates?: PropertyRow["templates"] }
      }

      if (!response.ok || !payload.property) {
        throw new Error(payload.error ?? "Failed to create property")
      }

      const createdProperty: PropertyRow = {
        id: payload.property.id,
        name: payload.property.name,
        streetAddress: payload.property.streetAddress ?? "",
        city: payload.property.city ?? "",
        state: payload.property.state ?? "",
        zip: payload.property.zip ?? "",
        phone: payload.property.phone ?? "",
        email: payload.property.email ?? "",
        fullAddress: payload.property.fullAddress,
        managementCompany: payload.property.managementCompany ?? { id: selectedCompany.id, name: selectedCompany.name },
        templates: payload.property.templates ?? [],
      }

      setPropertySelectOptions((prev) => [{ id: createdProperty.id, name: createdProperty.name }, ...prev.filter((item) => item.id !== createdProperty.id)])
      setCompanies((prev) =>
        prev.map((company) =>
          company.id === selectedCompany.id
            ? {
                ...company,
                properties: [{ id: createdProperty.id, name: createdProperty.name, fullAddress: createdProperty.fullAddress }, ...company.properties],
              }
            : company,
        ),
      )
      setSelectedCompany((prev) =>
        prev
          ? {
              ...prev,
              properties: [{ id: createdProperty.id, name: createdProperty.name, fullAddress: createdProperty.fullAddress }, ...prev.properties],
            }
          : prev,
      )
      setSelectedProperty(createdProperty)
      setPropertyDraft({ ...defaultPropertyDraft, managementCompanyId: selectedCompany.id })
      setIsPropertyCreateOpen(false)
      setMessage("Property created")
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create property")
    } finally {
      setIsCreatingProperty(false)
    }
  }

  async function createTemplateForProperty() {
    if (!selectedProperty) return
    setError("")
    setMessage("")
    setIsCreatingTemplate(true)

    try {
      if (!newTemplateDraft.templateTag.trim()) throw new Error("Template tag is required")

      const response = await fetch("/api/flooring/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newTemplateDraft,
          propertyId: selectedProperty.id,
          warehouseId: newTemplateDraft.warehouseId || null,
          padProductId: newTemplateDraft.padProductId || null,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string; template?: TemplateRow }
      if (!response.ok || !payload.template) {
        throw new Error(payload.error ?? "Failed to create template")
      }

      const createdTemplate = payload.template
      setSelectedProperty((prev) =>
        prev
          ? {
              ...prev,
              templates: [
                {
                  id: createdTemplate.id,
                  templateTag: createdTemplate.templateTag,
                  warehouseName: createdTemplate.warehouseName,
                  itemsCount: 0,
                },
                ...prev.templates,
              ],
            }
          : prev,
      )
      setNewTemplateDraft({ ...defaultTemplateDraft, propertyId: selectedProperty.id })
      setIsTemplateCreateOpen(false)
      setActiveTemplate(createdTemplate)
      setActiveTemplateDraft({
        templateTag: createdTemplate.templateTag,
        propertyId: createdTemplate.propertyId,
        warehouseId: createdTemplate.warehouseId,
        instructions: createdTemplate.instructions,
        templateNotes: createdTemplate.templateNotes,
        padProductId: createdTemplate.padProductId,
      })
      setTemplateItems([])
      setItemDraft(emptyItemDraft)
      setMessage("Template created")
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create template")
    } finally {
      setIsCreatingTemplate(false)
    }
  }

  async function saveActiveTemplate() {
    if (!activeTemplate) return
    setError("")
    setMessage("")
    setIsSavingTemplateModal(true)

    try {
      const response = await fetch(`/api/flooring/templates/${activeTemplate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...activeTemplateDraft,
          warehouseId: activeTemplateDraft.warehouseId || null,
          padProductId: activeTemplateDraft.padProductId || null,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string; template?: TemplateRow }
      if (!response.ok || !payload.template) {
        throw new Error(payload.error ?? "Failed to save template")
      }

      setActiveTemplate(payload.template)
      setActiveTemplateDraft({
        templateTag: payload.template.templateTag,
        propertyId: payload.template.propertyId,
        warehouseId: payload.template.warehouseId,
        instructions: payload.template.instructions,
        templateNotes: payload.template.templateNotes,
        padProductId: payload.template.padProductId,
      })

      await Promise.all(
        templateItems.map(async (item) => {
          const itemResponse = await fetch(`/api/flooring/templates/${payload.template!.id}/items/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: item.productId,
              quantity: item.quantity,
              notes: item.notes,
              storedDyeLot: item.storedDyeLot,
            }),
          })

          const itemPayload = (await itemResponse.json().catch(() => ({}))) as { error?: string }
          if (!itemResponse.ok) {
            throw new Error(itemPayload.error ?? "Failed to save template item")
          }
        }),
      )

      const refreshedItems = await loadTemplateItems(payload.template.id)

      if (selectedProperty?.id === payload.template.propertyId) {
        updateSelectedPropertyTemplateSummary(payload.template.id, refreshedItems.length, payload.template)
      }
      setMessage("Template saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save template")
    } finally {
      setIsSavingTemplateModal(false)
    }
  }

  function setTemplateItemField(itemId: string, field: keyof Omit<TemplateItem, "id" | "createdAt">, value: string) {
    setTemplateItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)))
  }

  async function addTemplateItem() {
    if (!activeTemplate) return
    setError("")
    setMessage("")
    setIsSavingItem(true)

    try {
      if (!itemDraft.productId) throw new Error("Product is required")
      if (!itemDraft.quantity.trim()) throw new Error("Quantity is required")

      const response = await fetch(`/api/flooring/templates/${activeTemplate.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemDraft),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(payload.error ?? "Failed to add template item")

      setItemDraft(emptyItemDraft)
      const items = await loadTemplateItems(activeTemplate.id)
      if (selectedProperty?.id === activeTemplate.propertyId) {
        updateSelectedPropertyTemplateSummary(activeTemplate.id, items.length)
      }
      setMessage("Template item added")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to add template item")
    } finally {
      setIsSavingItem(false)
    }
  }

  async function deleteTemplateItem(itemId: string) {
    if (!activeTemplate) return
    setError("")
    setMessage("")
    setDeletingItemId(itemId)

    try {
      const response = await fetch(`/api/flooring/templates/${activeTemplate.id}/items/${itemId}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(payload.error ?? "Failed to delete template item")

      const nextItems = templateItems.filter((item) => item.id !== itemId)
      setTemplateItems(nextItems)
      if (selectedProperty?.id === activeTemplate.propertyId) {
        updateSelectedPropertyTemplateSummary(activeTemplate.id, nextItems.length)
      }
      setMessage("Template item deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete template item")
    } finally {
      setDeletingItemId(null)
    }
  }

  async function createCompany() {
    setError("")
    setMessage("")
    setIsSavingNew(true)

    try {
      if (!newDraft.name.trim()) {
        throw new Error("Company name is required")
      }

      const response = await fetch("/api/management-companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDraft),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        managementCompany?: {
          id: string
          name: string
          streetAddress: string | null
          city: string | null
          state: string | null
          postalCode: string | null
          phone: string | null
          email: string | null
          properties: Array<{ id: string; name: string; fullAddress: string }>
        }
      }

      if (!response.ok || !payload.managementCompany) {
        throw new Error(payload.error ?? "Failed to create company")
      }

      const payloadCompany = payload.managementCompany
      const newCompany: ManagementCompanyRow = {
        id: payloadCompany.id,
        name: payloadCompany.name,
        streetAddress: payloadCompany.streetAddress ?? "",
        city: payloadCompany.city ?? "",
        state: payloadCompany.state ?? "",
        zip: payloadCompany.postalCode ?? "",
        phone: payloadCompany.phone ?? "",
        email: payloadCompany.email ?? "",
        fullAddress: computeFullAddress({
          streetAddress: payloadCompany.streetAddress ?? "",
          city: payloadCompany.city ?? "",
          state: payloadCompany.state ?? "",
          zip: payloadCompany.postalCode ?? "",
        }),
        properties: payloadCompany.properties,
      }

      setCompanies((prev) => [newCompany, ...prev])
      setNewDraft(defaultDraft)
      setIsCreateModalOpen(false)
      setMessage("Management company created")
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create company")
    } finally {
      setIsSavingNew(false)
    }
  }

  async function saveCompany(row: ManagementCompanyRow) {
    setError("")
    setMessage("")
    setIsSavingId(row.id)

    try {
      const draft = getDraft(row.id)
      const response = await fetch(`/api/management-companies/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        managementCompany?: {
          id: string
          name: string
          streetAddress: string | null
          city: string | null
          state: string | null
          postalCode: string | null
          phone: string | null
          email: string | null
          properties: Array<{ id: string; name: string; fullAddress: string }>
        }
      }

      if (!response.ok || !payload.managementCompany) {
        throw new Error(payload.error ?? "Failed to save company")
      }

      const company = payload.managementCompany
      const updatedCompany: ManagementCompanyRow = {
        id: company.id,
        name: company.name,
        streetAddress: company.streetAddress ?? "",
        city: company.city ?? "",
        state: company.state ?? "",
        zip: company.postalCode ?? "",
        phone: company.phone ?? "",
        email: company.email ?? "",
        fullAddress: computeFullAddress({
          streetAddress: company.streetAddress ?? "",
          city: company.city ?? "",
          state: company.state ?? "",
          zip: company.postalCode ?? "",
        }),
        properties: company.properties,
      }

      setCompanies((prev) => prev.map((item) => (item.id === row.id ? updatedCompany : item)))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      setMessage("Management company saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save company")
    } finally {
      setIsSavingId(null)
    }
  }

  async function deleteCompany(id: string) {
    setError("")
    setMessage("")
    setDeletingId(id)

    try {
      const response = await fetch(`/api/management-companies/${id}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete company")
      }

      setCompanies((prev) => prev.filter((company) => company.id !== id))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setMessage("Management company deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete company")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-500">Management Companies</h1>
            <p className="mt-1 text-sm text-[var(--foreground)]/70">
              Manage management company records and their linked property relationships.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setMessage("")
              setError("")
              setNewDraft(defaultDraft)
              setIsCreateModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black hover:bg-blue-400"
          >
            <Plus size={16} />
            Company
          </button>
        </div>

        {message && (
          <p className="mt-3 border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-3 border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
            {error}
          </p>
        )}

        <div className="mt-6 mb-4 flex items-center justify-between">
          <span className="text-xs text-[var(--foreground)]/60">{companies.length} total</span>
        </div>

        <div className="overflow-x-auto border-y border-[var(--panel-border)]">
          <table className="w-full min-w-[1320px] text-sm">
            <thead className="bg-[var(--panel-hover)] text-left">
              <tr>
                <th className="h-10 px-3 py-2">Open</th>
                <th className="h-10 px-3 py-2">Company</th>
                <th className="h-10 px-3 py-2">Street</th>
                <th className="h-10 px-3 py-2">City</th>
                <th className="h-10 px-3 py-2">State</th>
                <th className="h-10 px-3 py-2">Zip</th>
                <th className="h-10 px-3 py-2">Phone</th>
                <th className="h-10 px-3 py-2">Email</th>
                <th className="h-10 px-3 py-2">Full Address</th>
                <th className="h-10 px-3 py-2">Properties</th>
                <th className="h-10 px-3 py-2">Save</th>
                <th className="h-10 px-3 py-2">Delete</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((row) => {
                const draft = getDraft(row.id)
                const linkedProperties = row.properties.map((property) => property.name).join(", ") || "-"

                return (
                  <tr key={row.id} className="border-t border-[var(--panel-border)] hover:bg-[var(--panel-hover)]/40">
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => openCompany(row)}
                        className="rounded border border-[var(--panel-border)] px-2 py-1 text-xs hover:bg-[var(--panel-hover)]"
                      >
                        Open
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <input value={draft.name} onChange={(event) => setDraftField(row.id, "name", event.target.value)} className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={draft.streetAddress} onChange={(event) => setDraftField(row.id, "streetAddress", event.target.value)} className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={draft.city} onChange={(event) => setDraftField(row.id, "city", event.target.value)} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={draft.state}
                        onChange={(event) => setDraftField(row.id, "state", event.target.value)}
                        onBlur={(event) => setDraftField(row.id, "state", event.target.value)}
                        maxLength={2}
                        className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input value={draft.zip} onChange={(event) => setDraftField(row.id, "zip", event.target.value)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={draft.phone} onChange={(event) => setDraftField(row.id, "phone", event.target.value)} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={draft.email} onChange={(event) => setDraftField(row.id, "email", event.target.value)} className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                    <td className="px-3 py-2">{computeFullAddress(draft)}</td>
                    <td className="px-3 py-2">
                      <p className="text-xs text-[var(--foreground)]/70">{linkedProperties}</p>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void saveCompany(row)}
                        disabled={isSavingId === row.id}
                        className="rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60"
                      >
                        {isSavingId === row.id ? "Saving..." : "Save"}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void deleteCompany(row.id)}
                        disabled={deletingId === row.id}
                        className="rounded border border-rose-500/40 px-3 py-1 text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-60"
                      >
                        {deletingId === row.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                )
              })}

              {companies.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-[var(--foreground)]/70">No management companies yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </section>

      {isCreateModalOpen ? (
        <ModalShell title="New Management Company" onClose={() => !isSavingNew && setIsCreateModalOpen(false)}>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField label="Company Name">
                <input value={newDraft.name} onChange={(event) => setNewDraftField("name", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Street Address">
                <input value={newDraft.streetAddress} onChange={(event) => setNewDraftField("streetAddress", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="City">
                <input value={newDraft.city} onChange={(event) => setNewDraftField("city", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="State">
                <input value={newDraft.state} onChange={(event) => setNewDraftField("state", event.target.value)} maxLength={2} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Zip">
                <input value={newDraft.zip} onChange={(event) => setNewDraftField("zip", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Phone">
                <input value={newDraft.phone} onChange={(event) => setNewDraftField("phone", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Email">
                <input value={newDraft.email} onChange={(event) => setNewDraftField("email", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Full Address">
                <div className="min-h-11 rounded border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 px-3 py-2 text-sm">
                  {computeFullAddress(newDraft) || "Company address preview"}
                </div>
              </FormField>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} disabled={isSavingNew} className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm">
                Cancel
              </button>
              <button type="button" onClick={() => void createCompany()} disabled={isSavingNew} className="rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
                {isSavingNew ? "Creating..." : "Create Company"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {selectedCompany ? (
        <ModalShell
          title={selectedCompany.name}
          onClose={() => {
            closeTemplate()
            setSelectedProperty(null)
            setSelectedCompany(null)
          }}
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Address</p>
                <p className="mt-1 font-medium">{selectedCompany.fullAddress || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Phone</p>
                <p className="mt-1 font-medium">{selectedCompany.phone || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Email</p>
                <p className="mt-1 font-medium">{selectedCompany.email || "-"}</p>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Owned Properties</h3>
              {selectedCompany.properties.length === 0 ? (
                <p className="text-sm text-[var(--foreground)]/70">No properties linked.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {selectedCompany.properties.map((property) => (
                    <li key={property.id} className="rounded border border-[var(--panel-border)] p-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-[var(--foreground)]">{property.name}</p>
                          <p className="text-[var(--foreground)]/70">{property.fullAddress}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void openProperty(property.id)}
                          disabled={loadingPropertyId === property.id}
                          className="rounded border border-[var(--panel-border)] px-3 py-1 text-xs hover:bg-[var(--panel-hover)] disabled:opacity-60"
                        >
                          {loadingPropertyId === property.id ? "Loading..." : "Open"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 rounded-lg border border-[var(--panel-border)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">Add Property</h3>
                  <p className="text-sm text-[var(--foreground)]/70">Create a new property linked to this management company.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setError("")
                    setMessage("")
                    setPropertyDraft({ ...defaultPropertyDraft, managementCompanyId: selectedCompany.id })
                    setIsPropertyCreateOpen((prev) => !prev)
                  }}
                  className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)]"
                >
                  {isPropertyCreateOpen ? "Hide" : "Add Property"}
                </button>
              </div>

              {isPropertyCreateOpen ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <FormField label="Property Name">
                    <input value={propertyDraft.name} onChange={(event) => setPropertyDraftField("name", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
                  </FormField>
                  <FormField label="Street Address">
                    <input value={propertyDraft.streetAddress} onChange={(event) => setPropertyDraftField("streetAddress", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
                  </FormField>
                  <FormField label="City">
                    <input value={propertyDraft.city} onChange={(event) => setPropertyDraftField("city", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
                  </FormField>
                  <FormField label="State">
                    <input value={propertyDraft.state} onChange={(event) => setPropertyDraftField("state", event.target.value)} maxLength={2} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
                  </FormField>
                  <FormField label="Zip">
                    <input value={propertyDraft.zip} onChange={(event) => setPropertyDraftField("zip", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
                  </FormField>
                  <FormField label="Phone">
                    <input value={propertyDraft.phone} onChange={(event) => setPropertyDraftField("phone", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
                  </FormField>
                  <FormField label="Email">
                    <input value={propertyDraft.email} onChange={(event) => setPropertyDraftField("email", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
                  </FormField>
                  <FormField label="Full Address">
                    <div className="min-h-11 rounded border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 px-3 py-2 text-sm">
                      {computeFullAddress(propertyDraft) || "Property address preview"}
                    </div>
                  </FormField>
                  <div className="flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => void createPropertyForCompany()}
                      disabled={isCreatingProperty}
                      className="rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
                    >
                      {isCreatingProperty ? "Creating..." : "Create Property"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </ModalShell>
      ) : null}

      {selectedProperty ? (
        <ModalShell title={selectedProperty.name} onClose={() => setSelectedProperty(null)} zIndexClass="z-50">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Address</p>
                <p className="mt-1 font-medium">{selectedProperty.fullAddress || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Phone</p>
                <p className="mt-1 font-medium">{selectedProperty.phone || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Email</p>
                <p className="mt-1 font-medium">{selectedProperty.email || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Management Company</p>
                <p className="mt-1 font-medium">{selectedProperty.managementCompany?.name || "None"}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">Linked Templates</h3>
                  <p className="text-sm text-[var(--foreground)]/70">Templates assigned to this property.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setError("")
                    setMessage("")
                    setNewTemplateDraft({ ...defaultTemplateDraft, propertyId: selectedProperty.id })
                    setIsTemplateCreateOpen((prev) => !prev)
                  }}
                  className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)]"
                >
                  {isTemplateCreateOpen ? "Hide" : "Add Template"}
                </button>
              </div>
              {isTemplateCreateOpen ? (
                <div className="grid gap-4 rounded-lg border border-[var(--panel-border)] p-4 md:grid-cols-2 xl:grid-cols-3">
                  <FormField label="Template Tag">
                    <input value={newTemplateDraft.templateTag} onChange={(event) => setNewTemplateDraftField("templateTag", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
                  </FormField>
                  <FormField label="Warehouse">
                    <select value={newTemplateDraft.warehouseId} onChange={(event) => setNewTemplateDraftField("warehouseId", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                      <option value="">No warehouse</option>
                      {warehouseOptions.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Pad Type">
                    <select value={newTemplateDraft.padProductId} onChange={(event) => setNewTemplateDraftField("padProductId", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                      <option value="">No pad type</option>
                      {padProductOptions.map((product) => (
                        <option key={product.id} value={product.id}>{product.label}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Instructions">
                    <textarea value={newTemplateDraft.instructions} onChange={(event) => setNewTemplateDraftField("instructions", event.target.value)} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2" />
                  </FormField>
                  <FormField label="Template Notes">
                    <textarea value={newTemplateDraft.templateNotes} onChange={(event) => setNewTemplateDraftField("templateNotes", event.target.value)} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2" />
                  </FormField>
                  <div className="flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => void createTemplateForProperty()}
                      disabled={isCreatingTemplate}
                      className="rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
                    >
                      {isCreatingTemplate ? "Creating..." : "Create Template"}
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="overflow-x-auto rounded-lg border border-[var(--panel-border)]">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-[var(--panel-hover)] text-left">
                    <tr>
                      <th className="h-10 px-3 py-2">Open</th>
                      <th className="h-10 px-3 py-2">Template Tag</th>
                      <th className="h-10 px-3 py-2">Warehouse</th>
                      <th className="h-10 px-3 py-2">Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProperty.templates.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-[var(--foreground)]/70">No templates linked to this property.</td>
                      </tr>
                    ) : (
                      selectedProperty.templates.map((template) => (
                        <tr key={template.id} className="border-t border-[var(--panel-border)]">
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => void openTemplate(template.id)}
                              disabled={loadingTemplate}
                              className="rounded border border-[var(--panel-border)] px-3 py-1 text-xs hover:bg-[var(--panel-hover)] disabled:opacity-60"
                            >
                              {loadingTemplate ? "Loading..." : "Open"}
                            </button>
                          </td>
                          <td className="px-3 py-2">{template.templateTag}</td>
                          <td className="px-3 py-2">{template.warehouseName || "-"}</td>
                          <td className="px-3 py-2">{template.itemsCount}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeTemplate ? (
        <ModalShell title={`Template ${activeTemplate.templateTag}`} onClose={closeTemplate} zIndexClass="z-[60]">
          <div className="space-y-6">
            {message === "Template saved" ? (
              <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
                Template saved
              </p>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField label="Template Tag">
                <input value={activeTemplateDraft.templateTag} onChange={(event) => setActiveTemplateDraft((prev) => ({ ...prev, templateTag: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Property">
                <select value={activeTemplateDraft.propertyId} onChange={(event) => setActiveTemplateDraft((prev) => ({ ...prev, propertyId: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                  <option value="">Select property</option>
                  {propertySelectOptions.map((property) => (
                    <option key={property.id} value={property.id}>{property.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Warehouse">
                <select value={activeTemplateDraft.warehouseId} onChange={(event) => setActiveTemplateDraft((prev) => ({ ...prev, warehouseId: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                  <option value="">No warehouse</option>
                  {warehouseOptions.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Pad Type">
                <select value={activeTemplateDraft.padProductId} onChange={(event) => setActiveTemplateDraft((prev) => ({ ...prev, padProductId: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                  <option value="">No pad type</option>
                  {padProductOptions.map((product) => (
                    <option key={product.id} value={product.id}>{product.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Instructions">
                <textarea value={activeTemplateDraft.instructions} onChange={(event) => setActiveTemplateDraft((prev) => ({ ...prev, instructions: event.target.value }))} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2" />
              </FormField>
              <FormField label="Template Notes">
                <textarea value={activeTemplateDraft.templateNotes} onChange={(event) => setActiveTemplateDraft((prev) => ({ ...prev, templateNotes: event.target.value }))} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2" />
              </FormField>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold">Template Items</h3>
                <p className="text-sm text-[var(--foreground)]/70">Add the products and quantities this template should carry.</p>
              </div>

              <div className="grid gap-3 rounded-xl border border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)] md:grid-cols-[minmax(0,1.5fr),120px,160px,minmax(0,1fr),auto] md:items-end">
                <FormField label="Product">
                  <select value={itemDraft.productId} onChange={(event) => setItemDraft((prev) => ({ ...prev, productId: event.target.value }))} className="rounded border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2">
                    <option value="">Select product</option>
                    {productOptions.map((product) => (
                      <option key={product.id} value={product.id}>{product.label}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Qty">
                  <input value={itemDraft.quantity} onChange={(event) => setItemDraft((prev) => ({ ...prev, quantity: event.target.value }))} className="rounded border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2" />
                </FormField>
                <FormField label="Stored Dye Lot">
                  <input value={itemDraft.storedDyeLot} onChange={(event) => setItemDraft((prev) => ({ ...prev, storedDyeLot: event.target.value }))} className="rounded border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2" />
                </FormField>
                <FormField label="Notes">
                  <input value={itemDraft.notes} onChange={(event) => setItemDraft((prev) => ({ ...prev, notes: event.target.value }))} className="rounded border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2" />
                </FormField>
                <button type="button" onClick={() => void addTemplateItem()} disabled={isSavingItem} className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60">
                  {isSavingItem ? "Adding..." : "Add Item"}
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-[var(--subpanel-header-background)] text-left">
                    <tr>
                      <th className="h-10 px-3 py-2">Product</th>
                      <th className="h-10 px-3 py-2">Qty</th>
                      <th className="h-10 px-3 py-2">Unit</th>
                      <th className="h-10 px-3 py-2">Stored Dye Lot</th>
                      <th className="h-10 px-3 py-2">Notes</th>
                      <th className="h-10 px-3 py-2">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingItems ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-[var(--foreground)]/70">Loading items...</td>
                      </tr>
                    ) : templateItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-[var(--foreground)]/70">No template items yet.</td>
                      </tr>
                    ) : (
                      templateItems.map((item) => (
                        <tr key={item.id} className="border-t border-[var(--panel-border)]">
                          <td className="px-3 py-2">
                            <select value={item.productId} onChange={(event) => setTemplateItemField(item.id, "productId", event.target.value)} className="w-72 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
                              {productOptions.map((product) => (
                                <option key={product.id} value={product.id}>{product.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input value={item.quantity} onChange={(event) => setTemplateItemField(item.id, "quantity", event.target.value)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                          </td>
                          <td className="px-3 py-2">{productOptions.find((product) => product.id === item.productId)?.sendUnit || item.sendUnit || "-"}</td>
                          <td className="px-3 py-2">
                            <input value={item.storedDyeLot} onChange={(event) => setTemplateItemField(item.id, "storedDyeLot", event.target.value)} className="w-36 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                          </td>
                          <td className="px-3 py-2">
                            <input value={item.notes} onChange={(event) => setTemplateItemField(item.id, "notes", event.target.value)} className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                          </td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => void deleteTemplateItem(item.id)} disabled={deletingItemId === item.id} className="rounded border border-rose-500/40 px-3 py-1 text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-60">
                              {deletingItemId === item.id ? "Deleting..." : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeTemplate} disabled={isSavingTemplateModal} className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm">
                Close
              </button>
              <button type="button" onClick={() => void saveActiveTemplate()} disabled={isSavingTemplateModal} className="rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
                {isSavingTemplateModal ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}
