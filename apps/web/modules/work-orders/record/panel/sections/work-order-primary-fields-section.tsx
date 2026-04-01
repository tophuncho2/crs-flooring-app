"use client"

import type { Dispatch, SetStateAction } from "react"
import {
  AutoGrowTextarea,
  RECORD_FIELD_CONTROL_CLASS_NAME,
  RECORD_TEXTAREA_CONTROL_CLASS_NAME,
  RecordFormField,
} from "@/modules/shared/engines/record-view"
import {
  RecordPrimaryFieldCell,
  RecordPrimaryFieldsGrid,
  RecordPrimaryPane,
  RecordPrimarySection,
  RecordStaticFieldValue,
} from "@/modules/shared/engines/record-view"
import { WORK_ORDER_STATUS_OPTIONS, getWorkOrderStatusLabel } from "@/modules/work-orders/contracts"
import type { DraftWorkOrder, PropertyOption, WarehouseOption } from "@/modules/work-orders/types"

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
}: {
  draft: DraftWorkOrder
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  selectedAddressValue: string
  unitType: string
  setDraft: Dispatch<SetStateAction<DraftWorkOrder | null>>
}) {
  return (
    <RecordPrimarySection>
      <RecordPrimaryPane variant="side">
        <RecordPrimaryFieldsGrid variant="side">
          <RecordPrimaryFieldCell>
            <RecordFormField label="Warehouse">
              <select
                value={draft.warehouseId}
                onChange={(event) => setDraft((prev) => (prev ? { ...prev, warehouseId: event.target.value } : prev))}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
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
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
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
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
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
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
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
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
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
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Date">
              <input
                type="date"
                value={draft.date}
                onChange={(event) => setDraft((prev) => (prev ? { ...prev, date: event.target.value } : prev))}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
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
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="lg">
            <RecordFormField label="Notes">
              <AutoGrowTextarea
                value={draft.notes}
                onChange={(event) => setDraft((prev) => (prev ? { ...prev, notes: event.target.value } : prev))}
                className={RECORD_TEXTAREA_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="lg">
            <RecordFormField label="Instructions">
              <AutoGrowTextarea
                value={draft.instructions}
                onChange={(event) => setDraft((prev) => (prev ? { ...prev, instructions: event.target.value } : prev))}
                className={RECORD_TEXTAREA_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>
    </RecordPrimarySection>
  )
}
