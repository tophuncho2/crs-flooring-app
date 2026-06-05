"use client"

import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { EMPTY_MANAGEMENT_COMPANY_FORM } from "@builders/domain"
import { ActionHeader } from "@/components/headers"
import { usePropertyHubCreateSection } from "@/modules/properties/controllers/record/primary/use-property-hub-create-section"
import { ManagementCompanySelectSection } from "./primary/management-company-select-section"
import { PropertyCreateFieldsSection } from "./primary/property-create-fields-section"

const SECTION_CARD_CLASS =
  "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]"

/**
 * The unified property "hub" create form on the record-view engine — replaces
 * the retired hub side panel. One Create button over two groups: a management
 * company (link or create) and the property fields. Saving creates them
 * atomically via `/api/properties/hub` and lands on the created record.
 */
function PropertyHubCreatePanel({
  page,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
}) {
  const controller = usePropertyHubCreateSection({ page, backHref })
  const primary = controller.primarySection
  const editable = !primary.isSaving

  return (
    <RecordSingleSectionPanel
      title="New Property"
      controller={controller}
      showHeader={false}
      saveLabel="Create"
      savingLabel="Creating…"
    >
      <div className="space-y-4">
        <ManagementCompanySelectSection
          value={primary.localValue}
          disabled={!editable}
          onLink={(option) =>
            primary.setLocalValue((prev) =>
              option
                ? {
                    ...prev,
                    mcLinkId: option.id,
                    mcLinkLabel: option.name,
                    mcForm: EMPTY_MANAGEMENT_COMPANY_FORM,
                  }
                : { ...prev, mcLinkId: null, mcLinkLabel: null },
            )
          }
          onMcFieldChange={(field, next) =>
            primary.setLocalValue((prev) => ({
              ...prev,
              mcLinkId: null,
              mcLinkLabel: null,
              mcForm: { ...prev.mcForm, [field]: next },
            }))
          }
        />

        <div className={SECTION_CARD_CLASS}>
          <ActionHeader title="Property" />
          <div className="p-4">
            <PropertyCreateFieldsSection
              draft={primary.localValue.propertyForm}
              editable={editable}
              onFieldChange={(field, next) =>
                primary.setLocalValue((prev) => ({
                  ...prev,
                  propertyForm: { ...prev.propertyForm, [field]: next },
                }))
              }
            />
          </div>
        </div>
      </div>
    </RecordSingleSectionPanel>
  )
}

export function PropertyHubCreateClient({ backHref }: { backHref: string }) {
  return (
    <RecordCreateClientScaffold
      title="New Property"
      backHref={backHref}
      dirtyMessage="You have unsaved changes. Leave this form without saving?"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <PropertyHubCreatePanel page={page} backHref={backHref} />
      )}
    </RecordCreateClientScaffold>
  )
}
