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
import { formatEasternDateTime, type FlooringPaymentDirection } from "@builders/domain"
import type { PaymentRecordController } from "@/modules/payments/controllers/record/use-payment-record-controller"

const DIRECTION_OPTIONS = [
  { value: "INFLOW", label: "Inflow", tone: "success" as const },
  { value: "OUTFLOW", label: "Outflow", tone: "error" as const },
]

export function PaymentRecordFormFields({
  controller,
}: {
  controller: PaymentRecordController
}) {
  const { open, form, isSaving, setField } = controller
  const editable = !isSaving
  const payment = open.mode === "edit" ? open.payment : null

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={1}>
        <FormField label="Amount" required>
          <MoneyCell
            editable={editable}
            value={form.amount}
            onChange={(next) => setField("amount", next)}
            ariaLabel="Amount"
          />
        </FormField>
      </CellAt>
      <CellAt col={2} colSpan={3}>
        <FormField label="Direction" required>
          <SegmentedChoiceCell
            editable={editable}
            value={form.direction}
            onChange={(next) => setField("direction", next as FlooringPaymentDirection)}
            options={DIRECTION_OPTIONS}
            ariaLabel="Direction"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={2}>
        <FormField label="Type">
          <TextCell
            editable={editable}
            value={form.paymentType}
            onChange={(next) => setField("paymentType", next)}
            placeholder="e.g. deposit, invoice"
            ariaLabel="Payment type"
          />
        </FormField>
      </CellAt>
      <CellAt col={3} colSpan={2}>
        <FormField label="Method">
          <TextCell
            editable={editable}
            value={form.paymentMethod}
            onChange={(next) => setField("paymentMethod", next)}
            placeholder="e.g. check, ACH, card"
            ariaLabel="Payment method"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={2}>
        <FormField label="Date">
          <DateCell
            editable={editable}
            value={form.paymentDate}
            onChange={(next) => setField("paymentDate", next)}
            ariaLabel="Payment date"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="Memo">
          <TextareaCell
            editable={editable}
            value={form.memo}
            onChange={(next) => setField("memo", next)}
            placeholder="Memo"
            ariaLabel="Memo"
          />
        </FormField>
      </CellAt>
      {payment ? (
        <>
          <CellAt col={1} colSpan={2}>
            <FormField label="Created">
              <StaticFieldValue>
                {formatEasternDateTime(payment.createdAt) || "—"}
              </StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={3} colSpan={2}>
            <FormField label="Updated">
              <StaticFieldValue>
                {formatEasternDateTime(payment.updatedAt) || "—"}
              </StaticFieldValue>
            </FormField>
          </CellAt>
        </>
      ) : null}
    </FieldSection>
  )
}
