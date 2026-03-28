"use client"

import type { Dispatch, ReactNode, SetStateAction } from "react"
import { AutoGrowTextarea } from "@/features/dashboard/shared/record-view/forms/auto-grow-textarea"
import { RecordFormField } from "@/features/dashboard/shared/record-view/forms/record-form"
import { RecordSectionShell } from "@/features/dashboard/shared/record-view/sections/record-section-shell"
import {
  RecordPrimaryFieldCell,
  RecordPrimaryFieldsGrid,
  RecordPrimaryPane,
  RecordPrimarySection,
  RecordStaticFieldValue,
} from "@/features/dashboard/shared/record-view/shell/record-primary-fields"
import { WORK_ORDER_STATUS_OPTIONS, getWorkOrderStatusLabel } from "@/features/flooring/work-orders/contracts"
import type { DraftWorkOrder, PropertyOption, WarehouseOption } from "@/features/flooring/work-orders/types"

const vacancyOptions: Array<"VACANT" | "OCCUPIED"> = ["VACANT", "OCCUPIED"]

function statusLabel(value: string) {
  return getWorkOrderStatusLabel({ status: value, isComplete: false })
}

export function WorkOrderPrimaryFieldsSection({
  draft,
  propertyOptions,
  warehouseOptions,
  selectedAddressValue,
  unitType,
  setDraft,
  actionPanel,
}: {
  draft: DraftWorkOrder
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  selectedAddressValue: string
  unitType: string
  setDraft: Dispatch<SetStateAction<DraftWorkOrder | null>>
  actionPanel?: ReactNode
}) {
  return (
    <RecordSectionShell title="Work Order Details" bodyClassName="space-y-0" statusPanel={actionPanel}>
      <RecordPrimarySection>
        <RecordPrimaryPane variant="side">
          <RecordPrimaryFieldsGrid variant="side">
            <RecordPrimaryFieldCell>
              <RecordFormField label="Warehouse">
                <select
                  value={draft.warehouseId}
                  onChange={(event) => setDraft((prev) => (prev ? { ...prev, warehouseId: event.target.value } : prev))}
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                >
                  <option value="">No warehouse</option>
                  {warehouseOptions.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </RecordFormField>
            </RecordPrimaryFieldCell>
            <RecordPrimaryFieldCell>
              <RecordFormField label="Status">
                <select
                  value={draft.status}
                  onChange={(event) => setDraft((prev) => (prev ? { ...prev, status: event.target.value } : prev))}
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                >
                  {WORK_ORDER_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </RecordFormField>
            </RecordPrimaryFieldCell>
            <RecordPrimaryFieldCell>
              <RecordFormField label="Completion">
                <select
                  value={draft.isComplete ? "COMPLETE" : "OPEN"}
                  onChange={(event) =>
                    setDraft((prev) => (prev ? { ...prev, isComplete: event.target.value === "COMPLETE" } : prev))
                  }
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                >
                  <option value="OPEN">Open</option>
                  <option value="COMPLETE">Complete</option>
                </select>
              </RecordFormField>
            </RecordPrimaryFieldCell>
            <RecordPrimaryFieldCell>
              <RecordFormField label="Vacancy">
                <select
                  value={draft.vacancy}
                  onChange={(event) =>
                    setDraft((prev) => (prev ? { ...prev, vacancy: event.target.value as DraftWorkOrder["vacancy"] } : prev))
                  }
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                >
                  <option value="">Select vacancy</option>
                  {vacancyOptions.map((vacancy) => (
                    <option key={vacancy} value={vacancy}>
                      {vacancy}
                    </option>
                  ))}
                </select>
              </RecordFormField>
            </RecordPrimaryFieldCell>
          </RecordPrimaryFieldsGrid>
        </RecordPrimaryPane>

        <RecordPrimaryPane variant="main">
          <RecordPrimaryFieldsGrid>
            <RecordPrimaryFieldCell size="md">
              <RecordFormField label="Property">
                <select
                  value={draft.propertyId}
                  onChange={(event) => setDraft((prev) => (prev ? { ...prev, propertyId: event.target.value } : prev))}
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                >
                  <option value="">Select property</option>
                  {propertyOptions.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </RecordFormField>
            </RecordPrimaryFieldCell>
            <RecordPrimaryFieldCell size="lg">
              <RecordFormField label="Address">
                <RecordStaticFieldValue size="lg">
                  {selectedAddressValue || "Select a property or enter a custom address"}
                </RecordStaticFieldValue>
              </RecordFormField>
            </RecordPrimaryFieldCell>
            <RecordPrimaryFieldCell size="lg">
              <RecordFormField label="Custom Address">
                <input
                  value={draft.customAddress}
                  onChange={(event) => setDraft((prev) => (prev ? { ...prev, customAddress: event.target.value } : prev))}
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </RecordFormField>
            </RecordPrimaryFieldCell>
            <RecordPrimaryFieldCell size="sm">
              <RecordFormField label="Date">
                <input
                  type="date"
                  value={draft.date}
                  onChange={(event) => setDraft((prev) => (prev ? { ...prev, date: event.target.value } : prev))}
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </RecordFormField>
            </RecordPrimaryFieldCell>
            <RecordPrimaryFieldCell size="sm">
              <RecordFormField label="Unit Type">
                <RecordStaticFieldValue>{unitType || "Filled by template sync"}</RecordStaticFieldValue>
              </RecordFormField>
            </RecordPrimaryFieldCell>
            <RecordPrimaryFieldCell size="sm">
              <RecordFormField label="Unit Label">
                <input
                  value={draft.unitText}
                  onChange={(event) => setDraft((prev) => (prev ? { ...prev, unitText: event.target.value } : prev))}
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </RecordFormField>
            </RecordPrimaryFieldCell>
            <RecordPrimaryFieldCell size="lg">
              <RecordFormField label="Notes">
                <AutoGrowTextarea
                  value={draft.notes}
                  onChange={(event) => setDraft((prev) => (prev ? { ...prev, notes: event.target.value } : prev))}
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </RecordFormField>
            </RecordPrimaryFieldCell>
            <RecordPrimaryFieldCell size="lg">
              <RecordFormField label="Instructions">
                <AutoGrowTextarea
                  value={draft.instructions}
                  onChange={(event) => setDraft((prev) => (prev ? { ...prev, instructions: event.target.value } : prev))}
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </RecordFormField>
            </RecordPrimaryFieldCell>
          </RecordPrimaryFieldsGrid>
        </RecordPrimaryPane>
      </RecordPrimarySection>
    </RecordSectionShell>
  )
}
