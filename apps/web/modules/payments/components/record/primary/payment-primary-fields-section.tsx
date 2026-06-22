"use client"

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
  paymentNumber,
  draft,
  editable,
  onFieldChange,
  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
}: {
  paymentNumber?: string
  draft: PaymentForm
  editable: boolean
  onFieldChange: <K extends keyof PaymentForm>(field: K, value: PaymentForm[K]) => void
  createdAt?: string
  updatedAt?: string
  createdBy?: string | null
  updatedBy?: string | null
}) {
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
