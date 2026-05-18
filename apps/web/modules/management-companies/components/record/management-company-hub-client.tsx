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
import { useManagementCompanyPropertiesSection } from "@/modules/management-companies/controllers/record/properties/use-management-company-properties-section"

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
        <div className="flex flex-col gap-4">
          <ManagementCompanyPrimarySectionPanel page={page} company={company} />
          <ManagementCompanyPropertiesSection
            managementCompanyId={company.id}
            initialInput={initialPropertiesInput}
            onOpenProperty={propertiesSection.onOpenProperty}
          />
          <PropertySidePanel controller={propertiesSection.panel} />
        </div>
      )}
    </RecordDetailClientScaffold>
  )
}
