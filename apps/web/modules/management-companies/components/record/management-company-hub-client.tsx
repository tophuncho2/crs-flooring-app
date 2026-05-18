"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/scaffolds/record-detail-client-scaffold"
import type { ListInput, PropertiesListFilters } from "@builders/application"
import type { ManagementCompanyDetail } from "@builders/domain"
import { PropertySidePanel } from "@/modules/properties/components/side-panel"
import { ManagementCompanyPrimarySectionPanel } from "./primary/management-company-primary-section-panel"
import { ManagementCompanyPropertiesSection } from "./properties/management-company-properties-section"
import { ManagementCompanyRecordFooter } from "./footer"
import { useManagementCompanyPropertiesSection } from "@/modules/management-companies/controllers/record/properties/use-management-company-properties-section"
import { useManagementCompanyPrimarySection } from "@/modules/management-companies/controllers/record/primary/use-management-company-primary-section"

export function ManagementCompanyHubClient({
  company,
  backHref,
  initialPropertiesInput,
}: {
  company: ManagementCompanyDetail
  backHref: string
  initialPropertiesInput: ListInput<PropertiesListFilters>
}) {
  const propertiesSection = useManagementCompanyPropertiesSection()

  return (
    <RecordDetailClientScaffold
      title={`Management Company ${company.name}`}
      backHref={backHref}
      dirtyMessage="You have unsaved management company changes. Leave this management company without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <ManagementCompanyHubBody
          page={page}
          company={company}
          initialPropertiesInput={initialPropertiesInput}
          propertiesSection={propertiesSection}
        />
      )}
    </RecordDetailClientScaffold>
  )
}

function ManagementCompanyHubBody({
  page,
  company,
  initialPropertiesInput,
  propertiesSection,
}: {
  page: RecordDetailClientScaffoldContext
  company: ManagementCompanyDetail
  initialPropertiesInput: ListInput<PropertiesListFilters>
  propertiesSection: ReturnType<typeof useManagementCompanyPropertiesSection>
}) {
  const controller = useManagementCompanyPrimarySection({ page, company })

  return (
    <>
      <div className="flex flex-col gap-4">
        <ManagementCompanyPrimarySectionPanel page={page} controller={controller} />
        <ManagementCompanyPropertiesSection
          managementCompanyId={company.id}
          initialInput={initialPropertiesInput}
          onOpenProperty={propertiesSection.onOpenProperty}
        />
        <PropertySidePanel controller={propertiesSection.panel} />
      </div>
      <ManagementCompanyRecordFooter
        onClose={page.closePage}
        onDelete={controller.deleteRecord}
      />
    </>
  )
}
