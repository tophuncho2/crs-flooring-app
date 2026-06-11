"use client"

import { MoneyCell, TextCell } from "@/engines/record-view"
import { FieldSection, FormField, StaticFieldValue } from "@/engines/record-view"
import { CellAt } from "@/engines/record-view"
import { formatEasternDateTime } from "@builders/domain"
import { ContactPicker } from "@/modules/contacts/components/picker/contact-picker"
import { WorkOrderPicker } from "@/modules/work-orders/components/picker/work-order-picker"
import type { LaborPaymentEditController } from "@/modules/contacts/controllers/record/labor-payments/use-labor-payment-edit-controller"

/**
 * The labor-payment edit/create form body, rendered inside the contact record
 * view's drilldown section. The contact is **editable** (relink) via the async
 * `ContactPicker` and the work order via the async `WorkOrderPicker` (no
 * prefilter — any WO is selectable); unit / cost / description are free fields.
 * Read-only timestamps show in edit mode only.
 */
export function LaborPaymentEditFormFields({
  controller,
}: {
  controller: LaborPaymentEditController
}) {
  const { open, form, local, isSaving, setField, selectContact, selectWorkOrder } = controller
  const editable = !isSaving
  const editing = open?.mode === "edit"
  const laborPayment = open?.mode === "edit" ? open.laborPayment : null

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={3}>
        <FormField label="Contact" required>
          <ContactPicker
            value={form.contactId || null}
            onChange={(id) => {
              if (!id) selectContact(null)
            }}
            onOptionSelected={(option) => selectContact(option)}
            selectedLabel={local.contactLabel || null}
            disabled={!editable}
            placeholder="Select a contact"
            ariaLabel="Contact"
          />
        </FormField>
      </CellAt>
      <CellAt col={4} colSpan={1}>
        <FormField label="Cost">
          <MoneyCell
            editable={editable}
            value={form.cost}
            onChange={(next) => setField("cost", next)}
            ariaLabel="Cost"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="Work Order">
          <WorkOrderPicker
            value={form.workOrderId || null}
            onChange={(id) => {
              if (!id) selectWorkOrder(null)
            }}
            onOptionSelected={(option) => selectWorkOrder(option)}
            selectedLabel={local.workOrderLabel || null}
            disabled={!editable}
            ariaLabel="Work order"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="Unit">
          <TextCell
            editable={editable}
            value={form.unit}
            onChange={(next) => setField("unit", next)}
            placeholder="Room / area"
            ariaLabel="Unit"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="Description">
          <TextCell
            editable={editable}
            value={form.description}
            onChange={(next) => setField("description", next)}
            placeholder="Description"
            ariaLabel="Description"
          />
        </FormField>
      </CellAt>
      {editing && laborPayment ? (
        <>
          <CellAt col={1} colSpan={4}>
            <FormField label="Created">
              <StaticFieldValue>{formatEasternDateTime(laborPayment.createdAt) || "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={4}>
            <FormField label="Updated">
              <StaticFieldValue>{formatEasternDateTime(laborPayment.updatedAt) || "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
        </>
      ) : null}
    </FieldSection>
  )
}
