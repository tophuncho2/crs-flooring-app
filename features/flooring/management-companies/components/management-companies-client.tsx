"use client"

import { type ReactNode, useState } from "react"
import { Plus } from "lucide-react"
import { ManagementCompanyRecordPanel } from "./management-company-record-panel"
import { PropertyRecordPanel } from "../../properties/components/property-record-panel"
import { TemplateRecordModal } from "../../templates/components/template-record-modal"
import { DASHBOARD_PAGE_SHELL_CLASS_NAME, DashboardCardTitle } from "../../shared/dashboard-card-title"
import { ErrorNotice, SuccessNotice } from "../../shared/notices"
import { DeleteRowButton, EditRowButton, OpenRowButton } from "../../shared/row-action-buttons"
import { RecordFormField as FormField, RecordModalShell as ModalShell } from "../../shared/record-form"
import { RecordPanelStack } from "../../shared/record-panel-stack"
import { TableColumnSettings } from "../../shared/table-column-settings"
import TableControlsBar from "../../shared/table-controls-bar"
import { TableActionsSummary, TableEmptyRow, TableHead, TableHeaderCell, TablePaginationControls, TableShell } from "../../shared/table-shell"
import { useConfiguredTableState } from "../../shared/use-configured-table-state"
import { useServerTableQueryControls } from "../../shared/use-server-table-query-controls"
import type { ServiceOption, UnitOption } from "../../shared/service-items-editor"
import { buildFullAddress, normalizeAddressState } from "../../shared/address-helpers"
import { FormStatusNotices } from "../../shared/notices"
import type { TemplatePanelRow } from "../../templates/components/template-record-panel"

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

type TemplateRow = TemplatePanelRow

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

type ServerPaginationState = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  previousPageHref: string
  nextPageHref: string
}

type ServerTableState = {
  searchQuery: string
  isAscendingSort: boolean
  isGroupingEnabled: boolean
  groupByKeys: string[]
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

export default function ManagementCompaniesClient({
  initialCompanies,
  propertyOptions,
  warehouseOptions,
  padProductOptions,
  productOptions,
  serviceOptions,
  unitOptions,
  tableState,
  pagination,
}: {
  initialCompanies: ManagementCompanyRow[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  padProductOptions: PadProductOption[]
  productOptions: ProductOption[]
  serviceOptions: ServiceOption[]
  unitOptions: UnitOption[]
  tableState: ServerTableState
  pagination?: ServerPaginationState
}) {
  const [companies, setCompanies] = useState<ManagementCompanyRow[]>(initialCompanies)
  const [propertySelectOptions, setPropertySelectOptions] = useState<PropertyOption[]>(propertyOptions)
  const [newDraft, setNewDraft] = useState<DraftCompany>(defaultDraft)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [selectedCompany, setSelectedCompany] = useState<ManagementCompanyRow | null>(null)
  const [selectedCompanyMode, setSelectedCompanyMode] = useState<"view" | "edit">("view")
  const [selectedCompanyDraft, setSelectedCompanyDraft] = useState<DraftCompany>(defaultDraft)
  const [isSavingSelectedCompany, setIsSavingSelectedCompany] = useState(false)
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
    setGroupByKeys,
    filteredRows: filteredCompanies,
    sortedRows: sortedCompanies,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    allColumns: orderedCompanyColumns,
    visibleColumns: visibleCompanyColumns,
    hiddenColumnKeys: hiddenCompanyColumnKeys,
    toggleColumnVisibility: toggleCompanyColumnVisibility,
    moveColumn: moveCompanyColumn,
    setColumnOrder: setCompanyColumnOrder,
  } = useConfiguredTableState({
    rows: companies,
    tableKey: "management-companies-main",
    fields: [
      { key: "edit", label: "Edit", getValue: () => "", searchable: false, groupable: false },
      { key: "open", label: "Open", getValue: () => "", searchable: false, groupable: false },
      { key: "company", label: "Company", getValue: (row) => row.name },
      { key: "street", label: "Street", getValue: (row) => row.streetAddress },
      { key: "city", label: "City", getValue: (row) => row.city },
      { key: "state", label: "State", getValue: (row) => row.state },
      { key: "zip", label: "Zip", getValue: (row) => row.zip },
      { key: "phone", label: "Phone", getValue: (row) => row.phone },
      { key: "email", label: "Email", getValue: (row) => row.email },
      { key: "fullAddress", label: "Full Address", getValue: (row) => row.fullAddress },
      { key: "properties", label: "Properties", getValue: (row) => row.properties.map((property) => property.name).join(" ") },
      { key: "delete", label: "Delete", getValue: () => "", searchable: false, groupable: false },
    ],
    sortField: (row) => row.name,
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    disableClientFiltering: true,
    disableClientSorting: true,
    disableClientPagination: true,
  })
  const serverTableControls = useServerTableQueryControls({
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled: false,
    setIsGroupingEnabled: () => undefined,
    groupByKeys: [],
    setGroupByKeys,
    groupOptions: [],
  })

  function setNewDraftField(field: keyof DraftCompany, value: string | string[]) {
    const normalizedValue = field === "state" && typeof value === "string" ? normalizeAddressState(value) : value
    setNewDraft((prev) => ({ ...prev, [field]: normalizedValue }))
  }

  function setSelectedCompanyDraftField(field: keyof DraftCompany, value: string) {
    const normalizedValue = field === "state" ? normalizeAddressState(value) : value
    setSelectedCompanyDraft((prev) => ({ ...prev, [field]: normalizedValue }))
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

  function setPropertyDraftField(field: keyof DraftProperty, value: string) {
    const normalizedValue = field === "state" ? normalizeAddressState(value) : value
    setPropertyDraft((prev) => ({ ...prev, [field]: normalizedValue }))
  }

  function setNewTemplateDraftField(field: keyof DraftTemplate, value: string) {
    setNewTemplateDraft((prev) => ({ ...prev, [field]: value }))
  }

  function openCompany(company: ManagementCompanyRow, mode: "view" | "edit") {
    setError("")
    setMessage("")
    setIsPropertyCreateOpen(false)
    setPropertyDraft({ ...defaultPropertyDraft, managementCompanyId: company.id })
    setSelectedCompany(company)
    setSelectedCompanyMode(mode)
    setSelectedCompanyDraft(createCompanyDraft(company))
  }

  function closeCompanyPanel() {
    closeTemplate()
    setSelectedProperty(null)
    setSelectedCompany(null)
    setSelectedCompanyMode("view")
    setSelectedCompanyDraft(defaultDraft)
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
        fullAddress: buildFullAddress({
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
      if (selectedCompany?.id === id) {
        closeCompanyPanel()
      }
      setMessage("Management company deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete company")
    } finally {
      setDeletingId(null)
    }
  }

  async function saveSelectedCompany() {
    if (!selectedCompany) return
    setError("")
    setMessage("")
    setIsSavingSelectedCompany(true)

    try {
      if (!selectedCompanyDraft.name.trim()) {
        throw new Error("Company name is required")
      }

      const response = await fetch(`/api/flooring/management-companies/${selectedCompany.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedCompanyDraft.name,
          streetAddress: selectedCompanyDraft.streetAddress,
          city: selectedCompanyDraft.city,
          state: selectedCompanyDraft.state,
          zip: selectedCompanyDraft.zip,
          phone: selectedCompanyDraft.phone,
          email: selectedCompanyDraft.email,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
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
      }

      if (!response.ok || !payload.managementCompany) {
        throw new Error(payload.error ?? "Failed to save management company")
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
        properties: payload.managementCompany.properties ?? selectedCompany.properties,
      }

      setCompanies((prev) => prev.map((company) => (company.id === updatedCompany.id ? updatedCompany : company)))
      setSelectedCompany(updatedCompany)
      setSelectedCompanyDraft(createCompanyDraft(updatedCompany))
      setSelectedCompanyMode("edit")
      setSelectedProperty((prev) =>
        prev && prev.managementCompany?.id === updatedCompany.id
          ? {
              ...prev,
              managementCompany: { id: updatedCompany.id, name: updatedCompany.name },
            }
          : prev,
      )
      setMessage("Management company saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save management company")
    } finally {
      setIsSavingSelectedCompany(false)
    }
  }

  return (
    <div className={DASHBOARD_PAGE_SHELL_CLASS_NAME}>
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <DashboardCardTitle>Management Companies</DashboardCardTitle>
          </div>
          <TableActionsSummary count={filteredCompanies.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={serverTableControls.onSearchQueryChange}
              searchPlaceholder="Search company or property"
              isAscendingSort={isAscendingSort}
              onToggleSort={serverTableControls.onToggleSort}
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
                const linkedProperties = row.properties.map((property) => property.name).join(", ") || "-"
                const cells: Record<string, ReactNode> = {
                  edit: (
                    <td key="edit" className="px-2 py-2">
                      <EditRowButton onClick={() => openCompany(row, "edit")} className="px-2 py-1" />
                    </td>
                  ),
                  open: (
                    <td key="open" className="px-2 py-2">
                      <OpenRowButton onClick={() => openCompany(row, "view")} className="px-2 py-1">Open</OpenRowButton>
                    </td>
                  ),
                  company: <td key="company" className="px-3 py-2">{row.name}</td>,
                  street: <td key="street" className="px-3 py-2">{row.streetAddress || "-"}</td>,
                  city: <td key="city" className="px-3 py-2">{row.city || "-"}</td>,
                  state: <td key="state" className="px-3 py-2">{row.state || "-"}</td>,
                  zip: <td key="zip" className="px-3 py-2">{row.zip || "-"}</td>,
                  phone: <td key="phone" className="px-3 py-2">{row.phone || "-"}</td>,
                  email: <td key="email" className="px-3 py-2">{row.email || "-"}</td>,
                  fullAddress: <td key="fullAddress" className="px-3 py-2">{row.fullAddress || "-"}</td>,
                  properties: (
                    <td key="properties" className="px-3 py-2">
                      <p className="text-xs text-[var(--foreground)]/70">{linkedProperties}</p>
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
        <TablePaginationControls
          page={pagination?.page ?? page}
          totalPages={pagination?.totalPages ?? totalPages}
          pageSize={pagination?.pageSize ?? pageSize}
          totalItems={pagination?.totalItems ?? filteredCompanies.length}
          hasPreviousPage={pagination ? pagination.page > 1 : hasPreviousPage}
          hasNextPage={pagination ? pagination.page < pagination.totalPages : hasNextPage}
          onPreviousPage={pagination ? undefined : goToPreviousPage}
          onNextPage={pagination ? undefined : goToNextPage}
          previousPageHref={pagination?.previousPageHref}
          nextPageHref={pagination?.nextPageHref}
        />

      </section>

        {isCreateModalOpen ? (
          <ModalShell title="New Management Company" onClose={() => !isSavingNew && setIsCreateModalOpen(false)}>
            <div className="space-y-6">
              <FormStatusNotices error={error} loadingMessage={isSavingNew ? "Creating management company..." : ""} />
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
                    {buildFullAddress(newDraft) || "Company address preview"}
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
                  onClose: closeCompanyPanel,
                  content: (
                    <ManagementCompanyRecordPanel
                      company={selectedCompany}
                      mode={selectedCompanyMode}
                      draft={selectedCompanyDraft}
                      message={message}
                      error={error}
                      isPropertyCreateOpen={isPropertyCreateOpen}
                      propertyDraft={propertyDraft}
                      loadingPropertyId={loadingPropertyId}
                      isSaving={isSavingSelectedCompany}
                      onDraftChange={(field, value) => setSelectedCompanyDraftField(field, value)}
                      onSave={() => void saveSelectedCompany()}
                      onDelete={() => void deleteCompany(selectedCompany.id)}
                      onClose={closeCompanyPanel}
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
        ]}
      />

      {activeTemplate ? (
        <TemplateRecordModal
          template={activeTemplate}
          propertyOptions={propertySelectOptions}
          warehouseOptions={warehouseOptions}
          padProductOptions={padProductOptions}
          productOptions={productOptions}
          serviceOptions={serviceOptions}
          unitOptions={unitOptions}
          onClose={closeTemplate}
          onTemplateSaved={(template, previousPropertyId, itemsCount) => {
            setActiveTemplate(template)
            if (!selectedProperty) {
              return
            }

            if (selectedProperty.id === previousPropertyId && previousPropertyId !== template.propertyId) {
              setSelectedProperty((prev) =>
                prev
                  ? {
                      ...prev,
                      templates: prev.templates.filter((row) => row.id !== template.id),
                    }
                  : prev,
              )
              return
            }

            if (selectedProperty.id === template.propertyId) {
              updateSelectedPropertyTemplateSummary(template.id, itemsCount, template)
            }
          }}
          onTemplateDeleted={(templateId) => {
            if (selectedProperty) {
              setSelectedProperty((prev) =>
                prev
                  ? {
                      ...prev,
                      templates: prev.templates.filter((row) => row.id !== templateId),
                    }
                  : prev,
              )
            }
            setActiveTemplate(null)
          }}
          zIndex={60}
        />
      ) : null}
    </div>
  )
}
