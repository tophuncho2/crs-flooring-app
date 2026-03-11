"use client"

import { type ReactNode, useState } from "react"
import { Plus, X } from "lucide-react"
import { ErrorNotice, SuccessNotice } from "../shared/notices"
import { DeleteRowButton, OpenRowButton, SaveRowButton } from "../shared/row-action-buttons"
import TableControlsBar from "../shared/table-controls-bar"
import { ModalTableHead, ModalTableShell, TableActionsSummary, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TableShell } from "../shared/table-shell"
import { useTableControls } from "../shared/use-table-controls"

type ManagementCompanyOption = {
  id: string
  name: string
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

const defaultDraft: DraftProperty = {
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

function computeFullAddress(address: { streetAddress: string; city: string; state: string; zip: string }) {
  return [address.streetAddress, address.city, address.state, address.zip].filter(Boolean).join(", ")
}

function getManagementCompanyId(row: PropertyRow): string {
  return row.managementCompany?.id ?? ""
}

export default function PropertiesClient({
  initialProperties,
  managementOptions,
  propertyOptions,
  warehouseOptions,
  padProductOptions,
  productOptions,
}: {
  initialProperties: PropertyRow[]
  managementOptions: ManagementCompanyOption[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  padProductOptions: PadProductOption[]
  productOptions: ProductOption[]
}) {
  const [properties, setProperties] = useState<PropertyRow[]>(initialProperties)
  const [drafts, setDrafts] = useState<Record<string, DraftProperty>>({})
  const [newDraft, setNewDraft] = useState<DraftProperty>(defaultDraft)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [isSavingId, setIsSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [selectedProperty, setSelectedProperty] = useState<PropertyRow | null>(null)
  const [activeTemplate, setActiveTemplate] = useState<TemplateRow | null>(null)
  const [activeTemplateDraft, setActiveTemplateDraft] = useState<DraftTemplate>(defaultTemplateDraft)
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([])
  const [itemDraft, setItemDraft] = useState<TemplateItemDraft>(emptyItemDraft)
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [isSavingTemplateModal, setIsSavingTemplateModal] = useState(false)
  const [isSavingItem, setIsSavingItem] = useState(false)
  const [savingItemId, setSavingItemId] = useState<string | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const {
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    filteredRows: filteredProperties,
    sortedRows: sortedProperties,
    groupedRows: groupedProperties,
  } = useTableControls({
    rows: properties,
    searchFields: [
      { key: "name", getValue: (row) => row.name },
      { key: "managementCompany", getValue: (row) => row.managementCompany?.name ?? "No management company" },
    ],
    sortField: (row) => row.name,
    groupFields: [{ key: "managementCompany", label: "Management Company", getValue: (row) => row.managementCompany?.name ?? "No management company" }],
  })

  function getDraft(id: string): DraftProperty {
    if (drafts[id]) {
      return drafts[id]
    }

    const row = properties.find((property) => property.id === id)
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
      managementCompanyId: getManagementCompanyId(row),
    }
  }

  function setDraftField(id: string, field: keyof DraftProperty, value: string | string[]) {
    setDrafts((prev) => {
      const base = getDraft(id)
      const normalizedValue = field === "state" && typeof value === "string" ? normalizeState(value) : value
      return {
        ...prev,
        [id]: {
          ...base,
          [field]: normalizedValue,
        },
      }
    })
  }

  function setNewDraftField(field: keyof DraftProperty, value: string | string[]) {
    const normalizedValue = field === "state" && typeof value === "string" ? normalizeState(value) : value
    setNewDraft((prev) => ({ ...prev, [field]: normalizedValue }))
  }

  function updatePropertyTemplateSummary(propertyId: string, templateId: string, updater: (template: PropertyRow["templates"][number]) => PropertyRow["templates"][number] | null) {
    let nextSelectedProperty: PropertyRow | null = null

    setProperties((prev) =>
      prev.map((property) => {
        if (property.id !== propertyId) return property

        const nextTemplates = property.templates
          .map((template) => (template.id === templateId ? updater(template) : template))
          .filter((template): template is NonNullable<typeof template> => template !== null)

        const nextProperty = { ...property, templates: nextTemplates }
        if (selectedProperty?.id === propertyId) nextSelectedProperty = nextProperty
        return nextProperty
      }),
    )

    if (nextSelectedProperty) {
      setSelectedProperty(nextSelectedProperty)
    }
  }

  function appendPropertyTemplateSummary(propertyId: string, template: TemplateRow, itemsCount: number) {
    let nextSelectedProperty: PropertyRow | null = null

    setProperties((prev) =>
      prev.map((property) => {
        if (property.id !== propertyId) return property
        const existing = property.templates.find((item) => item.id === template.id)
        const nextTemplate = {
          id: template.id,
          templateTag: template.templateTag,
          warehouseName: template.warehouseName,
          itemsCount,
        }
        const nextTemplates = existing
          ? property.templates.map((item) => (item.id === template.id ? nextTemplate : item))
          : [nextTemplate, ...property.templates]
        const nextProperty = { ...property, templates: nextTemplates }
        if (selectedProperty?.id === propertyId) nextSelectedProperty = nextProperty
        return nextProperty
      }),
    )

    if (nextSelectedProperty) {
      setSelectedProperty(nextSelectedProperty)
    }
  }

  async function loadTemplateItems(templateId: string) {
    setLoadingItems(true)

    try {
      const response = await fetch(`/api/flooring/templates/${templateId}/items`)
      const payload = (await response.json().catch(() => ({}))) as { items?: TemplateItem[]; error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load template items")
      }

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
    if (isSavingTemplateModal || isSavingItem || savingItemId || deletingItemId) return
    setActiveTemplate(null)
    setActiveTemplateDraft(defaultTemplateDraft)
    setTemplateItems([])
    setItemDraft(emptyItemDraft)
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

      const itemsCount = templateItems.length
      const previousPropertyId = activeTemplate.propertyId
      const nextTemplate = payload.template

      setActiveTemplate(nextTemplate)
      setActiveTemplateDraft({
        templateTag: nextTemplate.templateTag,
        propertyId: nextTemplate.propertyId,
        warehouseId: nextTemplate.warehouseId,
        instructions: nextTemplate.instructions,
        templateNotes: nextTemplate.templateNotes,
        padProductId: nextTemplate.padProductId,
      })

      updatePropertyTemplateSummary(previousPropertyId, nextTemplate.id, () => null)
      appendPropertyTemplateSummary(nextTemplate.propertyId, nextTemplate, itemsCount)
      setMessage("Template saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save template")
    } finally {
      setIsSavingTemplateModal(false)
    }
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
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to add template item")
      }

      setItemDraft(emptyItemDraft)
      const items = await loadTemplateItems(activeTemplate.id)
      updatePropertyTemplateSummary(activeTemplate.propertyId, activeTemplate.id, (template) => ({ ...template, itemsCount: items.length }))
      setMessage("Template item added")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to add template item")
    } finally {
      setIsSavingItem(false)
    }
  }

  function setTemplateItemField(itemId: string, field: keyof Omit<TemplateItem, "id" | "createdAt">, value: string) {
    setTemplateItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)))
  }

  async function saveTemplateItem(item: TemplateItem) {
    if (!activeTemplate) return

    setError("")
    setMessage("")
    setSavingItemId(item.id)

    try {
      const response = await fetch(`/api/flooring/templates/${activeTemplate.id}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes,
          storedDyeLot: item.storedDyeLot,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save template item")
      }

      await loadTemplateItems(activeTemplate.id)
      setMessage("Template item saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save template item")
    } finally {
      setSavingItemId(null)
    }
  }

  async function deleteTemplateItem(itemId: string) {
    if (!activeTemplate) return

    setError("")
    setMessage("")
    setDeletingItemId(itemId)

    try {
      const response = await fetch(`/api/flooring/templates/${activeTemplate.id}/items/${itemId}`, {
        method: "DELETE",
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete template item")
      }

      const nextItems = templateItems.filter((item) => item.id !== itemId)
      setTemplateItems(nextItems)
      updatePropertyTemplateSummary(activeTemplate.propertyId, activeTemplate.id, (template) => ({ ...template, itemsCount: nextItems.length }))
      setMessage("Template item deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete template item")
    } finally {
      setDeletingItemId(null)
    }
  }

  async function createProperty() {
    setError("")
    setMessage("")
    setIsSavingNew(true)

    try {
      if (!newDraft.name.trim()) {
        throw new Error("Property name is required")
      }

      const response = await fetch("/api/properties-hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newDraft,
          managementCompanyId: newDraft.managementCompanyId || null,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        property?: PropertyRow & {
          managementCompany: {
            id: string
            name: string
          } | null
          templates?: PropertyRow["templates"]
        }
      }

      if (!response.ok || !payload.property) {
        throw new Error(payload.error ?? "Failed to create property")
      }

      const createdProperty = {
        ...payload.property,
        templates: payload.property.templates ?? [],
      }
      setProperties((prev) => [createdProperty, ...prev])
      setNewDraft(defaultDraft)
      setIsCreateModalOpen(false)
      setMessage("Property created")
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create property")
    } finally {
      setIsSavingNew(false)
    }
  }

  async function saveProperty(row: PropertyRow) {
    setError("")
    setMessage("")
    setIsSavingId(row.id)

    try {
      const draft = getDraft(row.id)
      const response = await fetch(`/api/properties-hub/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          managementCompanyId: draft.managementCompanyId || null,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        property?: {
          id: string
          name: string
          streetAddress: string | null
          city: string | null
          state: string | null
          zip: string | null
          phone: string | null
          email: string | null
          managementCompany: { id: string; name: string } | null
          fullAddress: string
          templates?: PropertyRow["templates"]
        }
      }

      if (!response.ok || !payload.property) {
        throw new Error(payload.error ?? "Failed to save property")
      }

      const nextProperty = {
        id: payload.property.id,
        name: payload.property.name,
        streetAddress: payload.property.streetAddress ?? "",
        city: payload.property.city ?? "",
        state: payload.property.state ?? "",
        zip: payload.property.zip ?? "",
        phone: payload.property.phone ?? "",
        email: payload.property.email ?? "",
        fullAddress: payload.property.fullAddress,
        managementCompany: payload.property.managementCompany,
        templates: payload.property.templates ?? row.templates,
      }

      setProperties((prev) => prev.map((property) => (property.id === row.id ? nextProperty : property)))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      setMessage("Property saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save property")
    } finally {
      setIsSavingId(null)
    }
  }

  async function deleteProperty(id: string) {
    setError("")
    setMessage("")
    setDeletingId(id)

    try {
      const response = await fetch(`/api/properties-hub/${id}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete property")
      }

      setProperties((prev) => prev.filter((property) => property.id !== id))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setMessage("Property deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete property")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-500">Properties</h1>
            <p className="mt-1 text-sm text-[var(--foreground)]/70">
              Manage property records for flooring work orders, including full address formulas and management links.
            </p>
          </div>
          <TableActionsSummary count={filteredProperties.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              searchPlaceholder="Search property or company"
              isAscendingSort={isAscendingSort}
              onToggleSort={() => setIsAscendingSort((prev) => !prev)}
              isGroupingEnabled={isGroupingEnabled}
              onToggleGrouping={() => setIsGroupingEnabled((prev) => !prev)}
            >
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
                Property
              </button>
            </TableControlsBar>
          </TableActionsSummary>
        </div>

        {!isCreateModalOpen && !selectedProperty && !activeTemplate && message ? <SuccessNotice className="mt-3">{message}</SuccessNotice> : null}
        {!isCreateModalOpen && !selectedProperty && !activeTemplate && error ? <ErrorNotice className="mt-3">{error}</ErrorNotice> : null}

        <TableShell minWidthClass="min-w-[1320px]">
            <TableHead>
              <tr>
                <TableHeaderCell>Open</TableHeaderCell>
                <TableHeaderCell>Property</TableHeaderCell>
                <TableHeaderCell>Street</TableHeaderCell>
                <TableHeaderCell>City</TableHeaderCell>
                <TableHeaderCell>State</TableHeaderCell>
                <TableHeaderCell>Zip</TableHeaderCell>
                <TableHeaderCell>Phone</TableHeaderCell>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>Full Address</TableHeaderCell>
                <TableHeaderCell>Management Company</TableHeaderCell>
                <TableHeaderCell>Save</TableHeaderCell>
                <TableHeaderCell>Delete</TableHeaderCell>
              </tr>
            </TableHead>
            <tbody>
              {(isGroupingEnabled
                ? groupedProperties.flatMap(([groupName, groupRows]) => [
                    { type: "group" as const, groupName },
                    ...groupRows.map((row) => ({ type: "row" as const, row })),
                  ])
                : sortedProperties.map((row) => ({ type: "row" as const, row }))
              ).map((entry) => {
                if (entry.type === "group") {
                  return <TableGroupRow key={`group-${entry.groupName}`} label={entry.groupName} colSpan={12} />
                }

                const row = entry.row
                const draft = getDraft(row.id)

                return (
                  <tr key={row.id} className="border-t border-[var(--panel-border)] hover:bg-[var(--panel-hover)]/40">
                    <td className="px-2 py-2">
                      <OpenRowButton onClick={() => setSelectedProperty(row)} className="px-2 py-1" />
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
                    <td className="px-3 py-2">{computeFullAddress({
                      streetAddress: draft.streetAddress,
                      city: draft.city,
                      state: draft.state,
                      zip: draft.zip,
                    })}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={draft.managementCompanyId}
                        onChange={(event) => setDraftField(row.id, "managementCompanyId", event.target.value)}
                        className="min-h-16 w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      >
                        <option value="">No management company</option>
                        {managementOptions.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <SaveRowButton onClick={() => void saveProperty(row)} disabled={isSavingId === row.id}>
                        {isSavingId === row.id ? "Saving..." : "Save"}
                      </SaveRowButton>
                    </td>
                    <td className="px-3 py-2">
                      <DeleteRowButton onClick={() => void deleteProperty(row.id)} disabled={deletingId === row.id}>
                        {deletingId === row.id ? "Deleting..." : "Delete"}
                      </DeleteRowButton>
                    </td>
                  </tr>
                )
              })}

              {filteredProperties.length === 0 ? <TableEmptyRow message="No properties found." colSpan={12} /> : null}
            </tbody>
        </TableShell>

      </section>

      {isCreateModalOpen ? (
        <ModalShell title="New Property" onClose={() => !isSavingNew && setIsCreateModalOpen(false)}>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField label="Property Name">
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
              <FormField label="Management Company">
                <select value={newDraft.managementCompanyId} onChange={(event) => setNewDraftField("managementCompanyId", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                  <option value="">No management company</option>
                  {managementOptions.map((company) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Phone">
                <input value={newDraft.phone} onChange={(event) => setNewDraftField("phone", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Email">
                <input value={newDraft.email} onChange={(event) => setNewDraftField("email", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Full Address">
                <div className="min-h-11 rounded border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 px-3 py-2 text-sm">
                  {computeFullAddress(newDraft) || "Property address preview"}
                </div>
              </FormField>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} disabled={isSavingNew} className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm">
                Cancel
              </button>
              <button type="button" onClick={() => void createProperty()} disabled={isSavingNew} className="rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
                {isSavingNew ? "Creating..." : "Create Property"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {selectedProperty ? (
        <ModalShell
          title={selectedProperty.name}
          onClose={() => {
            closeTemplate()
            setSelectedProperty(null)
          }}
        >
          <div className="space-y-6">
            {message ? <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p> : null}
            {error ? <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p> : null}
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
              <div>
                <h3 className="text-base font-semibold">Linked Templates</h3>
                <p className="text-sm text-[var(--foreground)]/70">Templates assigned to this property.</p>
              </div>
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
                              {loadingTemplate && activeTemplate?.id !== template.id ? "Loading..." : "Open"}
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
        <ModalShell title={`Template ${activeTemplate.templateTag}`} onClose={closeTemplate} zIndexClass="z-50">
          <div className="space-y-6">
            {message ? <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p> : null}
            {error ? <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p> : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField label="Template Tag">
                <input value={activeTemplateDraft.templateTag} onChange={(event) => setActiveTemplateDraft((prev) => ({ ...prev, templateTag: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Property">
                <select value={activeTemplateDraft.propertyId} onChange={(event) => setActiveTemplateDraft((prev) => ({ ...prev, propertyId: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                  <option value="">Select property</option>
                  {propertyOptions.map((property) => (
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

              <ModalTableShell minWidthClass="min-w-[900px]">
                <ModalTableHead>
                    <tr>
                      <TableHeaderCell>Product</TableHeaderCell>
                      <TableHeaderCell>Qty</TableHeaderCell>
                      <TableHeaderCell>Unit</TableHeaderCell>
                      <TableHeaderCell>Stored Dye Lot</TableHeaderCell>
                      <TableHeaderCell>Notes</TableHeaderCell>
                      <TableHeaderCell>Save</TableHeaderCell>
                      <TableHeaderCell>Delete</TableHeaderCell>
                    </tr>
                </ModalTableHead>
                  <tbody>
                    {loadingItems ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-[var(--foreground)]/70">Loading items...</td>
                      </tr>
                    ) : templateItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-[var(--foreground)]/70">No template items yet.</td>
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
                            <SaveRowButton onClick={() => void saveTemplateItem(item)} disabled={savingItemId === item.id}>
                              {savingItemId === item.id ? "Saving..." : "Save"}
                            </SaveRowButton>
                          </td>
                          <td className="px-3 py-2">
                            <DeleteRowButton onClick={() => void deleteTemplateItem(item.id)} disabled={deletingItemId === item.id}>
                              {deletingItemId === item.id ? "Deleting..." : "Delete"}
                            </DeleteRowButton>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
              </ModalTableShell>
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
