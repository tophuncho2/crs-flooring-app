"use client"

import type { RecordDetailClientScaffoldContext } from "@/engines/record-view"
import { TemplateReferenceSection } from "@/modules/templates/components/record/reference-section/template-reference-section"

/**
 * The Management Company record view's §3 templates section. Configures the
 * shared `TemplateReferenceSection` (owned by `modules/templates`) for a
 * management company: the MC is pre-seeded and **locked** while the Property
 * picker stays selectable, filtering the templates list to a property within the
 * company. Clicking a template row opens it in the template hub.
 */
export function ManagementCompanyTemplatesSection({
  page,
  managementCompany,
}: {
  page: RecordDetailClientScaffoldContext
  managementCompany: { id: string; name: string }
}) {
  return (
    <TemplateReferenceSection
      page={page}
      managementCompany={{ id: managementCompany.id, label: managementCompany.name }}
      managementCompanySelectable={false}
      propertySelectable
    />
  )
}
