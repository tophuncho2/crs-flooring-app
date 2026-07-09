"use client"

import { useState } from "react"
import {
  RecordEntityFooter,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import type { CertificateDetailRecord, EntityOption } from "@builders/domain"
import { useCertificatePrimarySection } from "@/modules/certificates/controllers/record/primary/use-certificate-primary-section"
import { useCertificateEntityNav } from "@/modules/certificates/controllers/record/use-certificate-entity-nav"
import { CertificatePrimaryFieldsSection } from "./primary/certificate-primary-fields-section"

export function CertificateRecordPanel({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: CertificateDetailRecord
}) {
  const { openEntity, createEntity } = useCertificateEntityNav()

  const controller = useCertificatePrimarySection({ page, entry })
  const primary = controller.primarySection
  const record = controller.record

  const selectedEntityId = primary.localValue.entityId || null

  // The picker trigger label lives locally (picker label-binding contract):
  // seeded from the linked entity, refreshed on pick. Re-seed on record swap,
  // reset during render (keyed on entry.id) so a pick/save on the SAME record is
  // never clobbered.
  const [entityLabel, setEntityLabel] = useState<string | null>(record.entity?.entity ?? null)
  const [seenEntryId, setSeenEntryId] = useState(entry.id)
  if (seenEntryId !== entry.id) {
    setSeenEntryId(entry.id)
    setEntityLabel(entry.entity?.entity ?? null)
  }

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 10,
      dirtyLabel: "certificate",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Certificate"
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
          <CertificatePrimaryFieldsSection
            draft={primary.localValue}
            editable={!primary.isSaving}
            onFieldChange={(field, value) =>
              primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
            }
            entity={{
              value: selectedEntityId,
              selectedLabel: entityLabel,
              onChange: (id) =>
                primary.setLocalValue((previous) => ({ ...previous, entityId: id ?? "" })),
              onOptionSelected: (option: EntityOption | null) =>
                setEntityLabel(option?.entity ?? null),
              onOpen: () => openEntity(selectedEntityId),
              onCreate: createEntity,
            }}
            status={record.status}
            createdAt={record.createdAt}
            updatedAt={record.updatedAt}
            createdBy={record.createdBy}
            updatedBy={record.updatedBy}
          />
        </RecordPrimarySectionInstance>
      ),
    },
  ]

  return (
    <>
      <RecordMultiSectionPanel page={page} sections={sections} />
      <RecordEntityFooter
        onClose={page.closePage}
        onDelete={controller.deleteRecord}
        deleteLabel="Delete Certificate"
        confirmTitle="Delete certificate?"
        confirmMessage="This cannot be undone."
      />
    </>
  )
}
