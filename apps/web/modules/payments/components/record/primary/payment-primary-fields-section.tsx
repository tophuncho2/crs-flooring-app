"use client"

import {
  CellAt,
  DateCell,
  FieldSection,
  FormField,
  MoneyCell,
  SegmentedChoiceCell,
  StaticFieldValue,
  TextCell,
  TextareaCell,
} from "@/engines/record-view"
import {
  formatEasternDateTime,
  type FlooringPaymentDirection,
  type PaymentForm,
} from "@builders/domain"

const DIRECTION_OPTIONS = [
  { value: "INFLOW", label: "Inflow", tone: "success" as const },
  { value: "OUTFLOW", label: "Outflow", tone: "error" as const },
]

/**
 * The payment primary-section fields. Data-injected per the engine convention:
 * the panel owns the draft + dirty/save state (single-section controller) and
 * hands this component `draft` / `editable` / `onFieldChange`. `createdAt` /
 * `updatedAt` are only supplied on the edit face (omitted on create).
 */
export function PaymentPrimaryFieldsSection({
  draft,
  editable,
  onFieldChange,
  createdAt,
  updatedAt,
}: {
  draft: PaymentForm
  editable: boolean
  onFieldChange: <K extends keyof PaymentForm>(field: K, value: PaymentForm[K]) => void
  createdAt?: string
  updatedAt?: string
}) {
  return (
    <FieldSection gap="0.75rem">
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
      <CellAt col={2} colSpan={3}>
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
        <FormField label="Type">
          <TextCell
            editable={editable}
            value={draft.paymentType}
            onChange={(next) => onFieldChange("paymentType", next)}
            placeholder="e.g. deposit, invoice"
            ariaLabel="Payment type"
          />
        </FormField>
      </CellAt>
      <CellAt col={3} colSpan={2}>
        <FormField label="Method">
          <TextCell
            editable={editable}
            value={draft.paymentMethod}
            onChange={(next) => onFieldChange("paymentMethod", next)}
            placeholder="e.g. check, ACH, card"
            ariaLabel="Payment method"
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
      <CellAt col={1} colSpan={4}>
        <FormField label="Memo">
          <TextareaCell
            editable={editable}
            value={draft.memo}
            onChange={(next) => onFieldChange("memo", next)}
            placeholder="Memo"
            ariaLabel="Memo"
          />
        </FormField>
      </CellAt>
      {createdAt ? (
        <>
          <CellAt col={1} colSpan={2}>
            <FormField label="Created">
              <StaticFieldValue>{formatEasternDateTime(createdAt) || "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={3} colSpan={2}>
            <FormField label="Updated">
              <StaticFieldValue>
                {updatedAt ? formatEasternDateTime(updatedAt) || "—" : "—"}
              </StaticFieldValue>
            </FormField>
          </CellAt>
        </>
      ) : null}
    </FieldSection>
  )
}
