"use client"

import { useState } from "react"
import {
  CellAt,
  DateCell,
  FieldSection,
  FormField,
  MoneyCell,
  SegmentedChoiceCell,
  StaticFieldValue,
} from "@/engines/record-view"
import {
  formatEasternDateTime,
  type EntityOption,
  type EntityTypeRef,
  type FlooringPaymentDirection,
  type PaymentForm,
  type WorkOrderOption,
} from "@builders/domain"
import {
  WorkOrderPicker,
  formatWorkOrderOptionTitle,
} from "@/modules/work-orders/components/picker/work-order-picker"
import { EntityPicker } from "@/modules/entities/components/picker/entity-picker"
import { EntityTypesArrayPicker } from "@/modules/entities/components/record/primary/entity-types-array-picker"

const DIRECTION_OPTIONS = [
  { value: "REVENUE", label: "Revenue", tone: "success" as const },
  { value: "EXPENSE", label: "Expense", tone: "error" as const },
]

type LinkPick = { id: string | null; label: string | null }

/**
 * The payment primary-section fields. Data-injected per the engine convention:
 * the panel owns the draft + dirty/save state (single-section controller) and
 * hands this component `draft` / `editable` / `onFieldChange`. `createdAt` /
 * `updatedAt` are only supplied on the edit face (omitted on create).
 *
 * `entityName` / `workOrderLabel` seed the picker triggers from the record so the
 * current link reads back after reload; a fresh pick overrides them via local
 * state until save. `entityTypes` + `linkedEntityId` drive the read-only Type(s)
 * chips — shown only on the detail face and only while the draft still points at
 * the saved entity (a just-picked, unsaved entity has no hydrated types yet).
 */
export function PaymentPrimaryFieldsSection({
  paymentNumber,
  draft,
  editable,
  onFieldChange,
  entityName,
  workOrderLabel,
  entityTypes,
  linkedEntityId,
  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
}: {
  paymentNumber?: string
  draft: PaymentForm
  editable: boolean
  onFieldChange: <K extends keyof PaymentForm>(field: K, value: PaymentForm[K]) => void
  entityName?: string | null
  workOrderLabel?: string | null
  entityTypes?: EntityTypeRef[]
  linkedEntityId?: string | null
  createdAt?: string
  updatedAt?: string
  createdBy?: string | null
  updatedBy?: string | null
}) {
  // A freshly picked option's label, kept until save reconciles the record. We
  // only trust it while its id still matches the draft; otherwise (discard, step)
  // fall back to the record-seeded label.
  const [entityPick, setEntityPick] = useState<LinkPick>({ id: null, label: null })
  const [workOrderPick, setWorkOrderPick] = useState<LinkPick>({ id: null, label: null })

  const entitySelectedLabel =
    entityPick.id === draft.entityId ? entityPick.label : entityName ?? null
  const workOrderSelectedLabel =
    workOrderPick.id === draft.workOrderId ? workOrderPick.label : workOrderLabel ?? null

  // Chips describe the SAVED entity; hide them the moment the draft points
  // somewhere else (newly picked, not yet persisted → no hydrated types).
  const showEntityTypes = Boolean(draft.entityId) && draft.entityId === (linkedEntityId ?? null)

  return (
    <FieldSection gap="0.75rem">
      {paymentNumber ? (
        <CellAt col={1} colSpan={2}>
          <FormField label="Payment #">
            <StaticFieldValue>{paymentNumber}</StaticFieldValue>
          </FormField>
        </CellAt>
      ) : null}
      <CellAt col={1} colSpan={1}>
        <FormField label="Amount" required>
          <MoneyCell
            editable={editable}
            value={draft.amount}
            onChange={(next) => onFieldChange("amount", next)}
            ariaLabel="Amount"
          />
        </FormField>
      </CellAt>
      <CellAt col={2} colSpan={1}>
        <FormField label="Direction" required>
          <SegmentedChoiceCell
            editable={editable}
            value={draft.direction}
            onChange={(next) => onFieldChange("direction", next as FlooringPaymentDirection)}
            options={DIRECTION_OPTIONS}
            ariaLabel="Direction"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={2}>
        <FormField label="Date">
          <DateCell
            editable={editable}
            value={draft.paymentDate}
            onChange={(next) => onFieldChange("paymentDate", next)}
            ariaLabel="Payment date"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={3}>
        <FormField label="Work Order">
          <WorkOrderPicker
            value={draft.workOrderId}
            selectedLabel={workOrderSelectedLabel}
            onChange={(id) => {
              onFieldChange("workOrderId", id)
              if (id === null) setWorkOrderPick({ id: null, label: null })
            }}
            onOptionSelected={(option: WorkOrderOption | null) =>
              setWorkOrderPick({
                id: option?.id ?? null,
                label: option ? formatWorkOrderOptionTitle(option) : null,
              })
            }
            disabled={!editable}
            ariaLabel="Work order"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={3}>
        <FormField label="Entity">
          <EntityPicker
            value={draft.entityId}
            selectedLabel={entitySelectedLabel}
            onChange={(id) => {
              onFieldChange("entityId", id)
              if (id === null) setEntityPick({ id: null, label: null })
            }}
            onOptionSelected={(option: EntityOption | null) =>
              setEntityPick({ id: option?.id ?? null, label: option?.entity ?? null })
            }
            placeholder="Select entity"
            disabled={!editable}
            ariaLabel="Entity"
          />
        </FormField>
      </CellAt>
      {showEntityTypes ? (
        <CellAt col={1} colSpan={3}>
          <FormField label="Type(s)">
            <EntityTypesArrayPicker
              selectedIds={(entityTypes ?? []).map((ref) => ref.id)}
              seedRefs={entityTypes ?? []}
              editable={false}
            />
          </FormField>
        </CellAt>
      ) : null}
      {createdAt ? (
        <>
          <CellAt col={1} colSpan={2}>
            <FormField label="Updated">
              <StaticFieldValue>
                {updatedAt ? formatEasternDateTime(updatedAt) || "—" : "—"}
              </StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={2}>
            <FormField label="Created">
              <StaticFieldValue>{formatEasternDateTime(createdAt) || "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={2}>
            <FormField label="Updated by">
              <StaticFieldValue>{updatedBy ?? "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={2}>
            <FormField label="Created by">
              <StaticFieldValue>{createdBy ?? "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
        </>
      ) : null}
    </FieldSection>
  )
}
