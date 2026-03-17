"use client"

import { type ReactNode, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { ManagementCompanyRecordPanel } from "./management-company-record-panel"
import { PropertyRecordPanel } from "../../properties/components/property-record-panel"
import { TemplateRecordPanel } from "../../templates/components/template-record-panel"
import { ErrorNotice, SuccessNotice } from "../../shared/notices"
import { DeleteRowButton, OpenRowButton, SaveRowButton } from "../../shared/row-action-buttons"
import { RecordFormField as FormField, RecordModalShell as ModalShell } from "../../shared/record-form"
import { RecordPanelStack } from "../../shared/record-panel-stack"
import { TableColumnSettings } from "../../shared/table-column-settings"
import TableControlsBar from "../../shared/table-controls-bar"
import { TableActionsSummary, TableEmptyRow, TableHead, TableHeaderCell, TableShell } from "../../shared/table-shell"
import { useTableColumns } from "../../shared/use-table-columns"
import { useTableControls } from "../../shared/use-table-controls"
import type { ServiceOption, UnitOption } from "../../shared/service-items-editor"

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

function normalizeState(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase()
}

function computeFullAddress(value: { streetAddress: string; city: string; state: string; zip: string }) {
  return [value.streetAddress, value.city, value.state, value.zip].filter(Boolean).join(", ")
}

export default function ManagementCompaniesClient({
  initialCompanies,
  propertyOptions,
  warehouseOptions,
  padProductOptions,
  productOptions,
  serviceOptions,
  unitOptions,
}: {
  initialCompanies: ManagementCompanyRow[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  padProductOptions: PadProductOption[]
  productOptions: ProductOption[]
  serviceOptions: ServiceOption[]
  unitOptions: UnitOption[]
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
  const [isTemplateCreateOpen, setIsTemplateCreateOpen] = useState(false)
  const [newTemplateDraft, setNewTemplateDraft] = useState<DraftTemplate>(defaultTemplateDraft)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const {
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    filteredRows: filteredCompanies,
    sortedRows: sortedCompanies,
  } = useTableControls({
    rows: companies,
    searchFields: [
      { key: "name", getValue: (row) => row.name },
      { key: "properties", getValue: (row) => row.properties.map((property) => property.name).join(" ") },
    ],
    sortField: (row) => row.name,
  })
  const companyColumns = useMemo(
    () => [
      { key: "open", label: "Open" },
      { key: "company", label: "Company" },
      { key: "street", label: "Street" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "zip", label: "Zip" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "fullAddress", label: "Full Address" },
      { key: "properties", label: "Properties" },
      { key: "save", label: "Save" },
      { key: "delete", label: "Delete" },
    ],
    [],
  )
  const {
    allColumns: orderedCompanyColumns,
    visibleColumns: visibleCompanyColumns,
    hiddenColumnKeys: hiddenCompanyColumnKeys,
    toggleColumnVisibility: toggleCompanyColumnVisibility,
    moveColumn: moveCompanyColumn,
    setColumnOrder: setCompanyColumnOrder,
  } = useTableColumns({
    tableKey: "management-companies-main",
    columns: companyColumns,
  })

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
      const response = await fetch(`/api/flooring/properties/${propertyId}`)
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
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load template")
      setActiveTemplate(null)
    } finally {
      setLoadingTemplate(false)
    }
  }

  function closeTemplate() {
    setActiveTemplate(null)
    setIsTemplateCreateOpen(false)
    setNewTemplateDraft(defaultTemplateDraft)
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

      const response = await fetch("/api/flooring/properties", {
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
      setMessage("Template created")
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create template")
    } finally {
      setIsCreatingTemplate(false)
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

      const response = await fetch("/api/flooring/management-companies", {
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
      const response = await fetch(`/api/flooring/management-companies/${row.id}`, {
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
      const response = await fetch(`/api/flooring/management-companies/${id}`, { method: "DELETE" })
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
          <TableActionsSummary count={filteredCompanies.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              searchPlaceholder="Search company or property"
              isAscendingSort={isAscendingSort}
              onToggleSort={() => setIsAscendingSort((prev) => !prev)}
              isGroupingEnabled={false}
              onToggleGrouping={() => {}}
              showGrouping={false}
            >
              <TableColumnSettings
                columns={orderedCompanyColumns}
                hiddenColumnKeys={hiddenCompanyColumnKeys}
                onToggleColumn={toggleCompanyColumnVisibility}
                onMoveColumn={moveCompanyColumn}
                onSetColumnOrder={setCompanyColumnOrder}
              />
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
            </TableControlsBar>
          </TableActionsSummary>
        </div>

        {message ? <SuccessNotice className="mt-3">{message}</SuccessNotice> : null}
        {error ? <ErrorNotice className="mt-3">{error}</ErrorNotice> : null}

        <TableShell minWidthClass="min-w-[1320px]">
            <TableHead>
              <tr>
                {visibleCompanyColumns.map((column) => (
                  <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
                ))}
              </tr>
            </TableHead>
            <tbody>
              {sortedCompanies.map((row) => {
                const draft = getDraft(row.id)
                const linkedProperties = row.properties.map((property) => property.name).join(", ") || "-"
                const cells: Record<string, ReactNode> = {
                  open: (
                    <td key="open" className="px-2 py-2">
                      <OpenRowButton onClick={() => openCompany(row)} className="px-2 py-1" />
                    </td>
                  ),
                  company: (
                    <td key="company" className="px-3 py-2">
                      <input value={draft.name} onChange={(event) => setDraftField(row.id, "name", event.target.value)} className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                  ),
                  street: (
                    <td key="street" className="px-3 py-2">
                      <input value={draft.streetAddress} onChange={(event) => setDraftField(row.id, "streetAddress", event.target.value)} className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                  ),
                  city: (
                    <td key="city" className="px-3 py-2">
                      <input value={draft.city} onChange={(event) => setDraftField(row.id, "city", event.target.value)} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                  ),
                  state: (
                    <td key="state" className="px-3 py-2">
                      <input
                        value={draft.state}
                        onChange={(event) => setDraftField(row.id, "state", event.target.value)}
                        onBlur={(event) => setDraftField(row.id, "state", event.target.value)}
                        maxLength={2}
                        className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      />
                    </td>
                  ),
                  zip: (
                    <td key="zip" className="px-3 py-2">
                      <input value={draft.zip} onChange={(event) => setDraftField(row.id, "zip", event.target.value)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                  ),
                  phone: (
                    <td key="phone" className="px-3 py-2">
                      <input value={draft.phone} onChange={(event) => setDraftField(row.id, "phone", event.target.value)} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                  ),
                  email: (
                    <td key="email" className="px-3 py-2">
                      <input value={draft.email} onChange={(event) => setDraftField(row.id, "email", event.target.value)} className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                  ),
                  fullAddress: <td key="fullAddress" className="px-3 py-2">{computeFullAddress(draft)}</td>,
                  properties: (
                    <td key="properties" className="px-3 py-2">
                      <p className="text-xs text-[var(--foreground)]/70">{linkedProperties}</p>
                    </td>
                  ),
                  save: (
                    <td key="save" className="px-3 py-2">
                      <SaveRowButton onClick={() => void saveCompany(row)} disabled={isSavingId === row.id}>
                        {isSavingId === row.id ? "Saving..." : "Save"}
                      </SaveRowButton>
                    </td>
                  ),
                  delete: (
                    <td key="delete" className="px-3 py-2">
                      <DeleteRowButton onClick={() => void deleteCompany(row.id)} disabled={deletingId === row.id}>
                        {deletingId === row.id ? "Deleting..." : "Delete"}
                      </DeleteRowButton>
                    </td>
                  ),
                }

                return (
                  <tr key={row.id} className="border-t border-[var(--panel-border)] hover:bg-[var(--panel-hover)]/40">
                    {visibleCompanyColumns.map((column) => cells[column.key])}
                  </tr>
                )
              })}

              {filteredCompanies.length === 0 ? <TableEmptyRow message="No management companies found." colSpan={visibleCompanyColumns.length} /> : null}
            </tbody>
        </TableShell>

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

      <RecordPanelStack
        layers={[
          ...(selectedCompany
            ? [
                {
                  key: `company-${selectedCompany.id}`,
                  title: selectedCompany.name,
                  onClose: () => {
                    closeTemplate()
                    setSelectedProperty(null)
                    setSelectedCompany(null)
                  },
                  content: (
                    <ManagementCompanyRecordPanel
                      company={selectedCompany}
                      isPropertyCreateOpen={isPropertyCreateOpen}
                      propertyDraft={propertyDraft}
                      loadingPropertyId={loadingPropertyId}
                      onPropertyDraftChange={(field, value) => setPropertyDraftField(field, value)}
                      onOpenProperty={(propertyId) => void openProperty(propertyId)}
                      onOpenCreateProperty={() => {
                        setError("")
                        setMessage("")
                        setPropertyDraft({ ...defaultPropertyDraft, managementCompanyId: selectedCompany.id })
                        setIsPropertyCreateOpen((prev) => !prev)
                      }}
                      onCancelCreateProperty={() => setIsPropertyCreateOpen(false)}
                      onCreateProperty={() => void createPropertyForCompany()}
                      isCreatingProperty={isCreatingProperty}
                    />
                  ),
                },
              ]
            : []),
          ...(selectedProperty
            ? [
                {
                  key: `property-${selectedProperty.id}`,
                  title: selectedProperty.name,
                  onClose: () => {
                    closeTemplate()
                    setSelectedProperty(null)
                  },
                  content: (
                    <PropertyRecordPanel
                      property={selectedProperty}
                      isTemplateCreateOpen={isTemplateCreateOpen}
                      newTemplateDraft={newTemplateDraft}
                      warehouseOptions={warehouseOptions}
                      padProductOptions={padProductOptions}
                      loadingTemplate={loadingTemplate}
                      onTemplateDraftChange={(field, value) => setNewTemplateDraftField(field, value)}
                      onOpenTemplate={(templateId) => void openTemplate(templateId)}
                      onOpenCreateTemplate={() => {
                        setError("")
                        setMessage("")
                        setNewTemplateDraft({ ...defaultTemplateDraft, propertyId: selectedProperty.id })
                        setIsTemplateCreateOpen((prev) => !prev)
                      }}
                      onCancelCreateTemplate={() => setIsTemplateCreateOpen(false)}
                      onCreateTemplate={() => void createTemplateForProperty()}
                      isCreatingTemplate={isCreatingTemplate}
                    />
                  ),
                },
              ]
            : []),
          ...(activeTemplate
            ? [
                {
                  key: `template-${activeTemplate.id}`,
                  title: `Template ${activeTemplate.templateTag}`,
                  onClose: closeTemplate,
                  content: (
                    <TemplateRecordPanel
                      templateId={activeTemplate.id}
                      propertyOptions={propertySelectOptions}
                      warehouseOptions={warehouseOptions}
                      padProductOptions={padProductOptions}
                      productOptions={productOptions}
                      serviceOptions={serviceOptions}
                      unitOptions={unitOptions}
                      onClose={closeTemplate}
                      onTemplateSaved={(template, _previousPropertyId, itemsCount) => {
                        setActiveTemplate(template)
                        if (selectedProperty?.id === template.propertyId) {
                          updateSelectedPropertyTemplateSummary(template.id, itemsCount, template)
                        }
                      }}
                      onTemplateDeleted={(templateId) => {
                        if (selectedProperty) {
                          updateSelectedPropertyTemplateSummary(templateId, 0)
                        }
                        setActiveTemplate(null)
                      }}
                    />
                  ),
                },
              ]
            : []),
        ]}
      />
    </div>
  )
}
