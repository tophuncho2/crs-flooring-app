"use client"

import { useCallback, useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { Contact, LaborPayment } from "@builders/domain"
import {
  RecordDrilldownSection,
  RecordEntityFooter,
  RecordItemSection,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import { NEW_LABOR_PAYMENT_ID } from "@/hooks/navigation"
import { useContactPrimarySection } from "@/modules/contacts/controllers/record/primary/use-contact-primary-section"
import { useContactLaborPaymentsSection } from "@/modules/contacts/controllers/record/labor-payments/use-contact-labor-payments-section"
import {
  CONTACT_LABOR_PAYMENTS_QUERY_KEY,
  laborPaymentByIdRequest,
} from "@/modules/contacts/data/contact-labor-payments-request"
import { CONTACT_WORK_ORDERS_QUERY_KEY } from "@/modules/contacts/data/contact-work-orders-request"
import { ContactPrimaryFieldsSection } from "./primary/contact-primary-fields-section"
import { ContactLaborPaymentsList } from "./labor-payments/contact-labor-payments-list"
import { EmbeddedLaborPaymentRecordView } from "./labor-payments/embedded-labor-payment-record-view"
import { ContactStatisticsSection } from "./statistics/contact-statistics-section"

/**
 * The contact record view. ① editable contact fields (primary) · ② labor-payments
 * drilldown (a paginated list ⇄ the embedded labor-payment edit/create view,
 * selection driven by the `?laborPayment` URL param the detail client owns).
 * Mirrors the inventory record view.
 */
export function ContactRecordView({
  page,
  entry,
  selectedLaborPaymentId,
  onSelectLaborPayment,
}: {
  page: RecordDetailClientScaffoldContext
  entry: Contact
  selectedLaborPaymentId: string | null
  onSelectLaborPayment: (laborPaymentId: string | null) => void
}) {
  const controller = useContactPrimarySection({ page, entry })
  const primary = controller.primarySection
  const record = controller.record

  const queryClient = useQueryClient()
  const handleLaborPaymentMutated = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: [...CONTACT_LABOR_PAYMENTS_QUERY_KEY, entry.id],
    })
    // A payment edit can change the contact's total labor cost and its set of
    // linked work orders — refresh the Statistics section too.
    void queryClient.invalidateQueries({
      queryKey: [...CONTACT_WORK_ORDERS_QUERY_KEY, entry.id],
    })
  }, [queryClient, entry.id])

  const laborPayments = useContactLaborPaymentsSection({
    contact: record,
    onMutated: handleLaborPaymentMutated,
  })

  const [embeddedDirty, setEmbeddedDirty] = useState(false)
  const [selectedRow, setSelectedRow] = useState<LaborPayment | null>(null)

  const handleSelectLaborPayment = useCallback(
    (id: string | null) => {
      if (id === null) setEmbeddedDirty(false)
      onSelectLaborPayment(id)
    },
    [onSelectLaborPayment],
  )

  // "+ Labor Payment" — drilldown into the create face. Mirrors the row-open
  // path, but with no source row to remember.
  const handleCreateLaborPayment = useCallback(() => {
    setSelectedRow(null)
    handleSelectLaborPayment(NEW_LABOR_PAYMENT_ID)
  }, [handleSelectLaborPayment])

  // Cold deep-link (e.g. from the labor-payments ledger): the URL carries an id
  // but the row isn't in memory (may not be on the section's first page).
  // Resolve it by id so edit opens regardless of page.
  const needsFetch =
    selectedLaborPaymentId !== null &&
    selectedLaborPaymentId !== NEW_LABOR_PAYMENT_ID &&
    (!selectedRow || selectedRow.id !== selectedLaborPaymentId)

  const byIdQuery = useQuery({
    enabled: needsFetch,
    queryKey: [...CONTACT_LABOR_PAYMENTS_QUERY_KEY, "by-id", selectedLaborPaymentId],
    queryFn: ({ signal }) => laborPaymentByIdRequest(selectedLaborPaymentId as string, signal),
  })

  const editRow =
    selectedRow && selectedRow.id === selectedLaborPaymentId
      ? selectedRow
      : byIdQuery.data && byIdQuery.data.id === selectedLaborPaymentId
        ? byIdQuery.data
        : null

  // Drive the shared labor-payment controller from the URL selection. Keyed on
  // the selection + resolved row (NOT the controller's open spec) so a save's
  // same-row refresh inside the controller is never clobbered.
  useEffect(() => {
    if (selectedLaborPaymentId === null) {
      laborPayments.panel.close()
    } else if (selectedLaborPaymentId === NEW_LABOR_PAYMENT_ID) {
      laborPayments.openCreate()
    } else if (editRow) {
      laborPayments.openEdit(editRow)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLaborPaymentId, editRow])

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 0,
      slot: "primary",
      dirtyLabel: "contact",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Contact"
          showHeader={false}
          error={primary.error}
          noticeMessage={primary.noticeMessage}
          noticeError={primary.noticeError}
          isDirty={primary.isDirty}
          isSaving={primary.isSaving}
          hasConflict={primary.hasConflict}
          onSave={() => void primary.save()}
          onDiscard={primary.discard}
        >
          <ContactPrimaryFieldsSection
            draft={primary.localValue}
            // Lock the contact fields while a labor payment is open below.
            editable={!primary.isSaving && selectedLaborPaymentId === null}
            onFieldChange={(field, value) =>
              primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
            }
            createdAt={record.createdAt}
            updatedAt={record.updatedAt}
          />
        </RecordPrimarySectionInstance>
      ),
    },
    {
      key: "laborPayments",
      type: "item",
      order: 10,
      dirtyLabel: "labor payment",
      controller: { isDirty: embeddedDirty },
      render: (ctx) => (
        // Persistent section chrome: the blue "Labor Payments" header + grey
        // body stay mounted across both faces — only the inner content swaps
        // (the DataTable list ⇄ the embedded edit cells). In list mode the
        // section toolbar carries "+ Labor Payment"; in edit mode it's empty
        // and the embedded face supplies its own Save / Discard / Delete
        // sub-header.
        <RecordItemSection
          title="Labor Payments"
          subHeader={
            selectedLaborPaymentId === null
              ? {
                  canManage: false,
                  showStatus: false,
                  isDirty: false,
                  isSaving: false,
                  hasConflict: false,
                  actions: [
                    {
                      key: "add-labor-payment",
                      label: "+ Labor Payment",
                      tone: "primary",
                      onClick: handleCreateLaborPayment,
                    },
                  ],
                }
              : undefined
          }
        >
          <RecordDrilldownSection
            page={ctx.page}
            selectedId={selectedLaborPaymentId}
            onSelect={handleSelectLaborPayment}
            hideBackBar
            renderList={(select) => (
              <ContactLaborPaymentsList
                contactId={entry.id}
                onSelect={(row) => {
                  setSelectedRow(row)
                  select(row.id)
                }}
              />
            )}
            renderDetail={(_id, onBack) => (
              <EmbeddedLaborPaymentRecordView
                controller={laborPayments.panel}
                hostPage={ctx.page}
                onBack={onBack}
                onDirtyChange={setEmbeddedDirty}
              />
            )}
          />
        </RecordItemSection>
      ),
    },
    {
      key: "statistics",
      type: "item",
      order: 20,
      render: () => <ContactStatisticsSection contactId={entry.id} />,
    },
  ]

  return (
    <>
      <RecordMultiSectionPanel page={page} sections={sections} />
      <RecordEntityFooter
        onClose={page.closePage}
        onDelete={() => controller.deleteRecord()}
        deleteLabel="Delete Contact"
        confirmTitle="Delete contact?"
        confirmMessage="This cannot be undone."
      />
    </>
  )
}
