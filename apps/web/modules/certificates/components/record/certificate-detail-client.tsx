"use client"

import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { CertificateDetailRecord } from "@builders/domain"
import { CertificateRecordPanel } from "./certificate-record-panel"

export function CertificateDetailClient({
  initialCertificate,
  backHref,
}: {
  initialCertificate: CertificateDetailRecord
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title="Certificate Tracking"
      backHref={backHref}
      headerVariant="section"
      dirtyMessage="You have unsaved certificate changes. Leave this page without saving?"
    >
      {(page) => <CertificateRecordPanel page={page} entry={initialCertificate} />}
    </RecordDetailClientScaffold>
  )
}
