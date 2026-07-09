"use client"

import { useState } from "react"
import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import {
  EMPTY_CERTIFICATE_FORM,
  type CertificatePrimaryForm,
  type EntityOption,
} from "@builders/domain"
import { buildRecordDetailHref } from "@/hooks/navigation/routes"
import { createCertificateRequest } from "@/modules/certificates/data/mutations"
import { useCertificateEntityNav } from "@/modules/certificates/controllers/record/use-certificate-entity-nav"
import { CertificatePrimaryFieldsSection } from "./primary/certificate-primary-fields-section"

function CertificateCreatePanel({
  page,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
}) {
  const { openEntity, createEntity } = useCertificateEntityNav()
  const [entityLabel, setEntityLabel] = useState<string | null>(null)

  const controller = useSingleSectionCreateController<CertificatePrimaryForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_CERTIFICATE_FORM }),
    createRecord: async (localValue) => {
      const { certificate } = await createCertificateRequest(localValue)
      return {
        redirectTo: buildRecordDetailHref("/dashboard/certificate-tracking", certificate.id, backHref),
      }
    },
  })

  const primary = controller.primarySection
  const selectedEntityId = primary.localValue.entityId || null

  return (
    <RecordSingleSectionPanel
      title="Certificate Details"
      controller={controller}
      showHeader={false}
      saveLabel="Create"
      savingLabel="Creating..."
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
          onOptionSelected: (option: EntityOption | null) => setEntityLabel(option?.entity ?? null),
          onOpen: () => openEntity(selectedEntityId),
          onCreate: createEntity,
        }}
      />
    </RecordSingleSectionPanel>
  )
}

export function CertificateCreateClient({ backHref }: { backHref: string }) {
  return (
    <RecordCreateClientScaffold
      title="New Certificate"
      backHref={backHref}
      dirtyMessage="You have unsaved certificate changes. Leave this form without saving?"
    >
      {(page) => <CertificateCreatePanel page={page} backHref={backHref} />}
    </RecordCreateClientScaffold>
  )
}
