"use client"

import type { RecordDetailClientScaffoldContext } from "@/engines/record-view"
import type { PropertyManagementCompany } from "@builders/domain"
import { TemplateReferenceSection } from "@/modules/templates/components/record/reference-section/template-reference-section"

/**
 * The Property record view's §2 templates section. Configures the shared
 * `TemplateReferenceSection` (owned by `modules/templates`) for a property: the
 * property is pre-seeded and **locked**, and the management company is pre-seeded
 * and locked too when the property has one (null for an orphan property). The
 * operator only browses the property's templates and clicks a row to open it in
 * the template hub. Always rendered — an orphan property simply shows its
 * templates with the MC picker empty.
 */
export function PropertyTemplatesSection({
  page,
  managementCompany,
  property,
}: {
  page: RecordDetailClientScaffoldContext
  managementCompany: PropertyManagementCompany | null
  property: { id: string; name: string }
}) {
  return (
    <TemplateReferenceSection
      page={page}
      managementCompany={
        managementCompany
          ? { id: managementCompany.id, label: managementCompany.name }
          : null
      }
      property={{ id: property.id, label: property.name }}
      managementCompanySelectable={false}
      propertySelectable={false}
    />
  )
}
