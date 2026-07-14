"use client"

import { useState } from "react"
import {
  CellAt,
  DateCell,
  FieldSection,
  FormField,
  MoneyCell,
  PhoneCell,
  RecordColumnBreak,
  RecordSectionDivider,
  SegmentedChoiceCell,
  StaticFieldValue,
  TextareaCell,
  TextCell,
} from "@/engines/record-view"
import {
  formatEasternDateTime,
  PAYMENT_METHOD_MAX,
  INTERNAL_NOTES_MAX,
  RECEIPT_NUMBER_MAX,
  STORE_ADDRESS_MAX,
  STORE_NUMBER_MAX,
  type EntityOption,
  type EntityTypeRef,
  type FlooringPaymentDirection,
  type PaletteColor,
  type PaymentForm,
  type PaymentPurposeOption,
  type WorkOrderOption,
} from "@builders/domain"
import { CellChip, PaletteColorDropdown } from "@/engines/common"
import {
  WorkOrderPicker,
  formatWorkOrderOptionTitle,
} from "@/modules/work-orders/components/picker/work-order-picker"
import { EntityTypePicker } from "@/modules/entities/components/picker/entity-type-picker"
import { EntityTypeMultiSelect } from "@/modules/entity-types/components/picker/entity-type-multi-select"
import { PaymentPurposePicker } from "@/modules/payment-purposes/components/picker/payment-purpose-picker"

const DIRECTION_OPTIONS = [
  { value: "REVENUE", label: "Revenue", tone: "success" as const },
  { value: "EXPENSE", label: "Expense", tone: "error" as const },
]

type LinkPick = { id: string | null; label: string | null }
type EntityPick = LinkPick & { types: EntityTypeRef[] }
type PurposePick = LinkPick & { color: PaletteColor | null }

/**
 * The payment primary-section fields. Data-injected per the engine convention:
 * the panel owns the draft + dirty/save state (single-section controller) and
 * hands this component `draft` / `editable` / `onFieldChange`. `createdAt` /
 * `updatedAt` are only supplied on the edit face (omitted on create).
 *
 * Layout: a centered `RecordColumnBreak` is retained for alignment, but every
 * editable field now stacks in the left flank — Payment # / Amount + Direction /
 * Work Order / Entity / Type(s) / Date — while the right flank stays empty. A
 * `RecordSectionDivider` then terminates the section above a read-only metadata
 * band (Created / Updated over Created by / Updated by). The create flow renders
 * neither the divider nor the band.
 *
 * `entityName` / `workOrderLabel` seed the picker triggers from the record so the
 * current link reads back after reload; a fresh pick overrides them via local
 * state until save. The read-only Type(s) chips render whenever an entity is
 * linked: a just-picked option carries its own types (shown immediately on
 * re-select), and otherwise `entityTypes` + `linkedEntityId` supply the saved
 * entity's hydrated types.
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
  paymentPurposeName,
  paymentPurposeColor,
  hideWorkOrder = false,
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
  /**
   * Record-seeded hydration for the linked payment purpose — the name + palette
   * color of the current `draft.paymentPurposeId`, so the picker's colored-chip
   * trigger reads back after reload. A fresh pick overrides them via local state
   * until save. Omitted on the create faces (no record yet).
   */
  paymentPurposeName?: string | null
  paymentPurposeColor?: PaletteColor | null
  /**
   * Omit the Work Order picker entirely. Set when the payment's work order is
   * pinned by context (the WO record-view create modal), so the link is fixed on
   * the draft and must not be user-editable.
   */
  hideWorkOrder?: boolean
  createdAt?: string
  updatedAt?: string
  createdBy?: string | null
  updatedBy?: string | null
}) {
  // A freshly picked option's label, kept until save reconciles the record. We
  // only trust it while its id still matches the draft; otherwise (discard, step)
  // fall back to the record-seeded label.
  const [entityPick, setEntityPick] = useState<EntityPick>({
    id: null,
    label: null,
    types: [],
  })
  const [workOrderPick, setWorkOrderPick] = useState<LinkPick>({ id: null, label: null })
  const [purposePick, setPurposePick] = useState<PurposePick>({
    id: null,
    label: null,
    color: null,
  })

  const entitySelectedLabel =
    entityPick.id === draft.entityId ? entityPick.label : entityName ?? null
  const workOrderSelectedLabel =
    workOrderPick.id === draft.workOrderId ? workOrderPick.label : workOrderLabel ?? null
  // Purpose trigger label + chip color, paralleling `entitySelectedLabel`: trust
  // the just-picked option while its id still matches the draft; otherwise fall
  // back to the record-seeded hydration (both null clears cleanly).
  const purposeSelectedLabel =
    purposePick.id === draft.paymentPurposeId ? purposePick.label : paymentPurposeName ?? null
  const purposeSelectedColor =
    purposePick.id === draft.paymentPurposeId ? purposePick.color : paymentPurposeColor ?? null

  // Type chips, paralleling `entitySelectedLabel`: trust the just-picked option's
  // types while its id still matches the draft (shows on re-select, pre-save);
  // otherwise fall back to the record-hydrated types when the draft still points
  // at the saved entity. The cell is rendered whenever an entity is linked.
  const shownEntityTypes =
    entityPick.id === draft.entityId
      ? entityPick.types
      : draft.entityId === (linkedEntityId ?? null)
        ? entityTypes ?? []
        : []

  return (
    <div className="flex flex-col gap-4">
      <RecordColumnBreak
        left={
          <FieldSection gap="0.75rem">
            {/* Left flank, top down: Payment # (unchanged width) / Amount + Direction
                paired / Work Order / Entity / Type(s) / Date. The full-width cells
                auto-flow in source order, so a hidden Type(s) leaves no gap. */}
            {paymentNumber ? (
              <CellAt col={1} row={1} colSpan={4}>
                <FormField label="Payment #">
                  {/* Palette tag recolors the PAY-# cell live off the draft —
                      mirrors the list cell + work-orders' record-view number cell. */}
                  <CellChip paletteColor={draft.color}>{paymentNumber}</CellChip>
                </FormField>
              </CellAt>
            ) : null}
            {/* Edit-only palette color tag, slotted just right of Payment # (2 wide).
                Gated to the edit face so the create flow stays clean — new rows fall
                to the DB default (SLATE). */}
            {paymentNumber ? (
              <CellAt col={5} row={1} colSpan={4}>
                <FormField label="Color">
                  <PaletteColorDropdown
                    value={draft.color}
                    editable={editable}
                    onChange={(color) => onFieldChange("color", color)}
                    ariaLabel="Payment color"
                  />
                </FormField>
              </CellAt>
            ) : null}
            <CellAt col={1} row={paymentNumber ? 2 : 1} colSpan={4}>
              <FormField label="Amount" required>
                <MoneyCell
                  editable={editable}
                  value={draft.amount}
                  onChange={(next) => onFieldChange("amount", next)}
                  ariaLabel="Amount"
                />
              </FormField>
            </CellAt>
            <CellAt col={5} row={paymentNumber ? 2 : 1} colSpan={4}>
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
            {hideWorkOrder ? null : (
              <CellAt col={1} colSpan={8}>
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
            )}
            <CellAt col={1} colSpan={8}>
              <FormField label="Purpose">
                <PaymentPurposePicker
                  value={draft.paymentPurposeId}
                  selectedLabel={purposeSelectedLabel}
                  selectedColor={purposeSelectedColor}
                  onChange={(id) => {
                    onFieldChange("paymentPurposeId", id)
                    if (id === null) setPurposePick({ id: null, label: null, color: null })
                  }}
                  onOptionSelected={(option: PaymentPurposeOption | null) =>
                    setPurposePick({
                      id: option?.id ?? null,
                      label: option?.name ?? null,
                      color: option?.color ?? null,
                    })
                  }
                  placeholder="Select purpose"
                  disabled={!editable}
                  ariaLabel="Payment purpose"
                />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField label="Entity">
                <EntityTypePicker
                  value={draft.entityId}
                  selectedLabel={entitySelectedLabel}
                  onChange={(id) => {
                    onFieldChange("entityId", id)
                    if (id === null) setEntityPick({ id: null, label: null, types: [] })
                  }}
                  onOptionSelected={(option: EntityOption | null) =>
                    setEntityPick({
                      id: option?.id ?? null,
                      label: option?.entity ?? null,
                      types: option?.types ?? [],
                    })
                  }
                  placeholder="Select entity"
                  disabled={!editable}
                  ariaLabel="Entity"
                />
              </FormField>
            </CellAt>
            {draft.entityId ? (
              <CellAt col={1} colSpan={8}>
                <FormField label="Type(s)">
                  <EntityTypeMultiSelect
                    selectedIds={shownEntityTypes.map((ref) => ref.id)}
                    seedRefs={shownEntityTypes}
                    editable={false}
                  />
                </FormField>
              </CellAt>
            ) : null}
            <CellAt col={1} colSpan={8}>
              <FormField label="Date">
                <DateCell
                  editable={editable}
                  value={draft.paymentDate}
                  onChange={(next) => onFieldChange("paymentDate", next)}
                  ariaLabel="Payment date"
                />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField label="Method">
                <TextCell
                  editable={editable}
                  value={draft.paymentMethod}
                  onChange={(next) => onFieldChange("paymentMethod", next)}
                  maxLength={PAYMENT_METHOD_MAX}
                  placeholder="Cash, Check #…, ACH"
                  ariaLabel="Payment method"
                />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField label="Receipt #">
                <TextCell
                  editable={editable}
                  value={draft.receiptNumber}
                  onChange={(next) => onFieldChange("receiptNumber", next)}
                  maxLength={RECEIPT_NUMBER_MAX}
                  placeholder="Receipt #"
                  ariaLabel="Receipt number"
                />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField label="Store Phone">
                <PhoneCell
                  editable={editable}
                  value={draft.storePhone}
                  onChange={(next) => onFieldChange("storePhone", next)}
                  ariaLabel="Store phone"
                />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField label="Store Address">
                <TextCell
                  editable={editable}
                  value={draft.storeAddress}
                  onChange={(next) => onFieldChange("storeAddress", next)}
                  maxLength={STORE_ADDRESS_MAX}
                  placeholder="Store address"
                  ariaLabel="Store address"
                />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField label="Store #">
                <TextCell
                  editable={editable}
                  value={draft.storeNumber}
                  onChange={(next) => onFieldChange("storeNumber", next)}
                  maxLength={STORE_NUMBER_MAX}
                  placeholder="Store #"
                  ariaLabel="Store number"
                />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField label="Internal Notes">
                <TextareaCell
                  editable={editable}
                  value={draft.internalNotes}
                  onChange={(next) => onFieldChange("internalNotes", next)}
                  placeholder="Internal notes"
                  ariaLabel="Internal notes"
                  rows={3}
                  maxLength={INTERNAL_NOTES_MAX}
                />
              </FormField>
            </CellAt>
          </FieldSection>
        }
        right={
          /* Right flank intentionally empty; the column break is retained. */
          <FieldSection gap="0.75rem">{null}</FieldSection>
        }
      />
      {createdAt ? (
        <>
          <RecordSectionDivider />
          {/* Read-only metadata band: Created / Updated over Created by / Updated by */}
          <FieldSection gap="0.75rem">
            <CellAt col={1} row={1} colSpan={4}>
              <FormField label="Created">
                <StaticFieldValue>{formatEasternDateTime(createdAt) || "—"}</StaticFieldValue>
              </FormField>
            </CellAt>
            <CellAt col={5} row={1} colSpan={4}>
              <FormField label="Updated">
                <StaticFieldValue>
                  {updatedAt ? formatEasternDateTime(updatedAt) || "—" : "—"}
                </StaticFieldValue>
              </FormField>
            </CellAt>
            <CellAt col={1} row={2} colSpan={4}>
              <FormField label="Created by">
                <StaticFieldValue>{createdBy ?? "—"}</StaticFieldValue>
              </FormField>
            </CellAt>
            <CellAt col={5} row={2} colSpan={4}>
              <FormField label="Updated by">
                <StaticFieldValue>{updatedBy ?? "—"}</StaticFieldValue>
              </FormField>
            </CellAt>
          </FieldSection>
        </>
      ) : null}
    </div>
  )
}
