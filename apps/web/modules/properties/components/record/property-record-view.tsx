"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import {
  toManagementCompanyForm,
  type ManagementCompanyOption,
  type PropertyDetailRecord,
} from "@builders/domain"
import { ActionHeader } from "@/components/headers"
import {
  buildCurrentRecordEntryPath,
  buildRecordDetailHref,
} from "@/hooks/navigation/routes"
import {
  MANAGEMENT_COMPANY_DETAIL_QUERY_KEY,
  getManagementCompanyDetailRequest,
} from "@/modules/management-companies/data/management-company-detail-request"
import { ManagementCompanyCellsSection } from "@/modules/management-companies/components/record/management-company-cells-section"
import { TemplatesSectionList } from "@/modules/templates/components/record/templates-section-list"
import { usePropertyPrimarySection } from "@/modules/properties/controllers/record/primary/use-property-primary-section"
import { PropertyPrimaryFieldsSection } from "./primary/property-primary-fields-section"

const SECTION_CARD_CLASS =
  "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]"

/**
 * The single Property record view body, used in two hosts:
 * - **standalone** (`/dashboard/properties/[id]`) with its own scaffold `page`;
 * - **embedded** inside the MC record view's properties drilldown section,
 *   sharing the MC page (via an embedded page proxy) — `embedded` omits the
 *   circular §1 MC cells and the footer.
 *
 * Sections: ① read-only MC cells + open-arrow (hidden when embedded), ②
 * property cells + editable MC picker (the primary), ③ templates for this
 * property.
 */
export function PropertyRecordView({
  page,
  entry,
  embedded = false,
  onDirtyChange,
}: {
  page: RecordDetailClientScaffoldContext
  entry: PropertyDetailRecord
  embedded?: boolean
  onDirtyChange?: (isDirty: boolean) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)

  const controller = usePropertyPrimarySection({ page, entry })
  const primary = controller.primarySection
  const record = controller.record
  const mcId = record.managementCompany?.id ?? null
  const [mcLabel, setMcLabel] = useState<string | null>(
    record.managementCompany?.name ?? null,
  )

  // §1 read-only MC cells need the full MC detail (address/phone/email), which
  // the property detail's `managementCompany` (id + name only) doesn't carry.
  const mcDetailQuery = useQuery({
    queryKey: [...MANAGEMENT_COMPANY_DETAIL_QUERY_KEY, mcId],
    queryFn: () => getManagementCompanyDetailRequest(mcId as string),
    enabled: !embedded && mcId !== null,
  })

  // Read-only MC cells card, rendered above the property fields inside the
  // primary section (standalone only) so the page keeps a single top header and
  // "MC first" ordering. Omitted when embedded (the host MC view is the MC).
  const managementCompanyBlock = (
    <div className={SECTION_CARD_CLASS}>
      <ActionHeader
        title="Management Company"
        actions={
          mcId
            ? [
                {
                  key: "open",
                  label: "Open",
                  kind: "secondary",
                  onClick: () =>
                    router.push(
                      buildRecordDetailHref("/dashboard/management-companies", mcId, returnTo),
                    ),
                },
              ]
            : undefined
        }
      />
      <div className="p-4">
        {mcId === null ? (
          <p className="text-sm text-[var(--foreground)]/60">No management company linked.</p>
        ) : mcDetailQuery.data ? (
          <ManagementCompanyCellsSection
            editable={false}
            form={toManagementCompanyForm(mcDetailQuery.data)}
          />
        ) : (
          <p className="text-sm text-[var(--foreground)]/60">Loading…</p>
        )}
      </div>
    </div>
  )

  const sections: RecordPanelSectionConfig[] = []

  sections.push({
    key: "primary",
    type: "field",
    order: 10,
    slot: embedded ? undefined : "primary",
    dirtyLabel: "property",
    controller: primary,
    render: () => (
      <RecordPrimarySectionInstance
        title="Property"
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
        {embedded ? null : <div className="mb-4">{managementCompanyBlock}</div>}
        <PropertyPrimaryFieldsSection
          draft={primary.localValue}
          editable={!primary.isSaving}
          onFieldChange={(field, value) =>
            primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
          }
          managementCompanyLabel={mcLabel}
          onManagementCompanyOption={(option: ManagementCompanyOption | null) =>
            setMcLabel(option?.name ?? null)
          }
        />
      </RecordPrimarySectionInstance>
    ),
  })

  sections.push({
    key: "templates",
    type: "item",
    order: 20,
    render: () => <TemplatesSectionList filters={{ propertyId: [entry.id] }} />,
  })

  return (
    <RecordMultiSectionPanel
      page={page}
      sections={sections}
      onDirtyChange={onDirtyChange}
      footer={
        embedded
          ? undefined
          : { onClose: page.closePage, onDelete: () => void controller.deleteRecord() }
      }
    />
  )
}
