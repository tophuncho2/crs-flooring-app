"use client"

import type { RecordDetailClientScaffoldContext } from "@/engines/record-view"
import type { PropertyManagementCompany } from "@builders/domain"
import { TemplateReferenceSection } from "@/modules/templates/components/record/reference-section/template-reference-section"

/**
 * The Property record view's §2 templates section. Configures the shared
 * `TemplateReferenceSection` (owned by `modules/templates`) for a property: both
 * the management company and the property are pre-seeded and **locked**, so the
 * operator only browses the property's templates and clicks a row to open it in
 * the template hub. Rendered only when the property has a linked management
 * company (the section's scope).
 */
export function PropertyTemplatesSection({
  page,
  managementCompany,
  property,
}: {
  page: RecordDetailClientScaffoldContext
  managementCompany: PropertyManagementCompany
  property: { id: string; name: string }
}) {
  return (
    <TemplateReferenceSection
      page={page}
      managementCompany={{ id: managementCompany.id, label: managementCompany.name }}
      property={{ id: property.id, label: property.name }}
      managementCompanySelectable={false}
      propertySelectable={false}
    />
  )
}
