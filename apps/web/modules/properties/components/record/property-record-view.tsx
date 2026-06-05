"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ExternalLink } from "lucide-react"
import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  RecordSectionShell,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import {
  toManagementCompanyForm,
  type ManagementCompanyOption,
  type PropertyDetailRecord,
} from "@builders/domain"
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

const OPEN_LINKED_CLASS =
  "inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--panel-border)] bg-transparent px-2.5 py-1 text-xs font-medium text-[var(--foreground)]/70 transition hover:bg-[var(--panel-border)]/30 focus:outline-none focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-50"

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

  const sections: RecordPanelSectionConfig[] = []

  if (!embedded) {
    sections.push({
      key: "management-company",
      type: "field",
      order: 0,
      render: () => (
        <RecordSectionShell
          title="Management Company"
          actions={
            mcId ? (
              <button
                type="button"
                className={OPEN_LINKED_CLASS}
                onClick={() =>
                  router.push(
                    buildRecordDetailHref("/dashboard/management-companies", mcId, returnTo),
                  )
                }
              >
                Open <ExternalLink size={12} />
              </button>
            ) : undefined
          }
        >
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
        </RecordSectionShell>
      ),
    })
  }

  sections.push({
    key: "primary",
    type: "field",
    order: 10,
    dirtyLabel: "property",
    controller: primary,
    render: () => (
      <RecordPrimarySectionInstance
        title="Property"
        error={primary.error}
        noticeMessage={primary.noticeMessage}
        noticeError={primary.noticeError}
        isDirty={primary.isDirty}
        isSaving={primary.isSaving}
        hasConflict={primary.hasConflict}
        onSave={() => void primary.save()}
        onDiscard={primary.discard}
      >
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
    render: () => (
      <RecordSectionShell title="Templates">
        <TemplatesSectionList filters={{ propertyId: [entry.id] }} />
      </RecordSectionShell>
    ),
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
