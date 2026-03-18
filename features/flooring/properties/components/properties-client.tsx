"use client"

import { type ReactNode, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { PropertyRecordPanel } from "./property-record-panel"
import { TemplateRecordPanel } from "../../templates/components/template-record-panel"
import { ErrorNotice, SuccessNotice } from "../../shared/notices"
import { DeleteRowButton, EditRowButton, OpenRowButton } from "../../shared/row-action-buttons"
import { RecordFormField as FormField, RecordModalShell as ModalShell } from "../../shared/record-form"
import { RecordPanelStack } from "../../shared/record-panel-stack"
import { TableColumnSettings } from "../../shared/table-column-settings"
import TableControlsBar from "../../shared/table-controls-bar"
import { TableActionsSummary, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TableShell } from "../../shared/table-shell"
import type { ServiceOption, UnitOption } from "../../shared/service-items-editor"
import { useTableColumns } from "../../shared/use-table-columns"
import { useTableControls } from "../../shared/use-table-controls"

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

type DraftTemplate = {
  templateTag: string
  propertyId: string
  warehouseId: string
  instructions: string
  templateNotes: string
  padProductId: string
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

function normalizeState(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase()
}

function computeFullAddress(address: { streetAddress: string; city: string; state: string; zip: string }) {
  return [address.streetAddress, address.city, address.state, address.zip].filter(Boolean).join(", ")
}

export default function PropertiesClient({
  initialProperties,
  managementOptions,
  propertyOptions,
  warehouseOptions,
  padProductOptions,
  productOptions,
  serviceOptions,
  unitOptions,
}: {
  initialProperties: PropertyRow[]
  managementOptions: ManagementCompanyOption[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  padProductOptions: PadProductOption[]
  productOptions: ProductOption[]
  serviceOptions: ServiceOption[]
  unitOptions: UnitOption[]
}) {
  const [properties, setProperties] = useState<PropertyRow[]>(initialProperties)
  const [newDraft, setNewDraft] = useState<DraftProperty>(defaultDraft)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [selectedProperty, setSelectedProperty] = useState<PropertyRow | null>(null)
  const [activeTemplate, setActiveTemplate] = useState<TemplateRow | null>(null)
  const [loadingTemplate, setLoadingTemplate] = useState(false)
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
  const propertyColumns = useMemo(
    () => [
      { key: "edit", label: "Edit" },
      { key: "open", label: "Open" },
      { key: "property", label: "Property" },
      { key: "street", label: "Street" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "zip", label: "Zip" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "fullAddress", label: "Full Address" },
      { key: "managementCompany", label: "Management Company" },
      { key: "delete", label: "Delete" },
    ],
    [],
  )
  const {
    allColumns: orderedPropertyColumns,
    visibleColumns: visiblePropertyColumns,
    hiddenColumnKeys: hiddenPropertyColumnKeys,
    toggleColumnVisibility: togglePropertyColumnVisibility,
    moveColumn: movePropertyColumn,
    setColumnOrder: setPropertyColumnOrder,
  } = useTableColumns({
    tableKey: "properties-main",
    columns: propertyColumns,
  })

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
  }

  async function createProperty() {
    setError("")
    setMessage("")
    setIsSavingNew(true)

    try {
      if (!newDraft.name.trim()) {
        throw new Error("Property name is required")
      }

      const response = await fetch("/api/flooring/properties", {
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

  async function deleteProperty(id: string) {
    setError("")
    setMessage("")
    setDeletingId(id)

    try {
      const response = await fetch(`/api/flooring/properties/${id}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete property")
      }

      setProperties((prev) => prev.filter((property) => property.id !== id))
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
              <TableColumnSettings
                columns={orderedPropertyColumns}
                hiddenColumnKeys={hiddenPropertyColumnKeys}
                onToggleColumn={togglePropertyColumnVisibility}
                onMoveColumn={movePropertyColumn}
                onSetColumnOrder={setPropertyColumnOrder}
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
                {visiblePropertyColumns.map((column) => (
                  <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
                ))}
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
                  return <TableGroupRow key={`group-${entry.groupName}`} label={entry.groupName} colSpan={visiblePropertyColumns.length} />
                }

                const row = entry.row
                const cells: Record<string, ReactNode> = {
                  edit: (
                    <td key="edit" className="px-2 py-2">
                      <EditRowButton onClick={() => setSelectedProperty(row)} className="px-2 py-1" />
                    </td>
                  ),
                  open: (
                    <td key="open" className="px-2 py-2">
                      <OpenRowButton onClick={() => setSelectedProperty(row)} className="px-2 py-1">Open</OpenRowButton>
                    </td>
                  ),
                  property: <td key="property" className="px-3 py-2">{row.name}</td>,
                  street: <td key="street" className="px-3 py-2">{row.streetAddress || "-"}</td>,
                  city: <td key="city" className="px-3 py-2">{row.city || "-"}</td>,
                  state: <td key="state" className="px-3 py-2">{row.state || "-"}</td>,
                  zip: <td key="zip" className="px-3 py-2">{row.zip || "-"}</td>,
                  phone: <td key="phone" className="px-3 py-2">{row.phone || "-"}</td>,
                  email: <td key="email" className="px-3 py-2">{row.email || "-"}</td>,
                  fullAddress: <td key="fullAddress" className="px-3 py-2">{row.fullAddress || "-"}</td>,
                  managementCompany: <td key="managementCompany" className="px-3 py-2">{row.managementCompany?.name || "No management company"}</td>,
                  delete: (
                    <td key="delete" className="px-3 py-2">
                      <DeleteRowButton onClick={() => void deleteProperty(row.id)} disabled={deletingId === row.id}>
                        {deletingId === row.id ? "Deleting..." : "Delete"}
                      </DeleteRowButton>
                    </td>
                  ),
                }

                return (
                  <tr key={row.id} className="border-t border-[var(--panel-border)] hover:bg-[var(--panel-hover)]/40">
                    {visiblePropertyColumns.map((column) => cells[column.key])}
                  </tr>
                )
              })}

              {filteredProperties.length === 0 ? <TableEmptyRow message="No properties found." colSpan={visiblePropertyColumns.length} /> : null}
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

      <RecordPanelStack
        layers={[
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
                      isTemplateCreateOpen={false}
                      newTemplateDraft={defaultTemplateDraft}
                      warehouseOptions={warehouseOptions}
                      padProductOptions={padProductOptions}
                      loadingTemplate={loadingTemplate}
                      onTemplateDraftChange={() => undefined}
                      onOpenTemplate={(templateId) => void openTemplate(templateId)}
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
                      initialTemplate={activeTemplate}
                      propertyOptions={propertyOptions}
                      warehouseOptions={warehouseOptions}
                      padProductOptions={padProductOptions}
                      productOptions={productOptions}
                      serviceOptions={serviceOptions}
                      unitOptions={unitOptions}
                      onClose={closeTemplate}
                      onTemplateSaved={(template, previousPropertyId, itemsCount) => {
                        updatePropertyTemplateSummary(previousPropertyId, template.id, () => null)
                        appendPropertyTemplateSummary(template.propertyId, template, itemsCount)
                        setActiveTemplate(template)
                      }}
                      onTemplateDeleted={(templateId, propertyId) => {
                        updatePropertyTemplateSummary(propertyId, templateId, () => null)
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
