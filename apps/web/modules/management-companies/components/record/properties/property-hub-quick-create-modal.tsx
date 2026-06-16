"use client"

import { QuickCreateModal } from "@/engines/record-view"
import { ActionHeader } from "@/engines/common"
import {
  EMPTY_MANAGEMENT_COMPANY_FORM,
  type ManagementCompanyDetail,
  type PropertyDetailRecord,
} from "@builders/domain"
import { usePropertyHubQuickCreate } from "@/modules/management-companies/controllers/record/properties/use-property-hub-quick-create"
import { PropertyFieldsSection } from "@/modules/properties/components/record/primary/property-fields-section"
import { ManagementCompanySelectSection } from "./primary/management-company-select-section"

const SECTION_CARD_CLASS =
  "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]"

/**
 * The quick-create property form mounted in a modal inside a record view — a
 * trimmed copy of the full hub create page (`PropertyHubCreatePanel`). Shows the
 * MC picker + MC name (create), and property name/address/instructions; omits MC
 * phone/email/address and property phone/email. Creates atomically via
 * `/api/properties/hub`, then hands the created records back through `onCreated`
 * so the host can fill the originating cell (no navigation).
 */
export function PropertyHubQuickCreateModal({
  open,
  onClose,
  onCreated,
  initialManagementCompany,
}: {
  open: boolean
  onClose: () => void
  onCreated: (
    property: PropertyDetailRecord,
    managementCompany: ManagementCompanyDetail | null,
  ) => void
  initialManagementCompany?: { id: string; label: string | null } | null
}) {
  const controller = usePropertyHubQuickCreate({ initialManagementCompany })
  const editable = !controller.isSaving

  async function handleCreate() {
    const result = await controller.save()
    if (result?.property) {
      onCreated(result.property, result.managementCompany)
    }
  }

  return (
    <QuickCreateModal
      open={open}
      title="New Property"
      onClose={onClose}
      onCreate={() => void handleCreate()}
      canCreate={controller.canCreate}
      isSaving={controller.isSaving}
      error={controller.error}
    >
      <div className="space-y-4">
        <ManagementCompanySelectSection
          value={controller.localValue}
          disabled={!editable}
          compact
          onLink={(option) =>
            controller.setLocalValue((prev) =>
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
            controller.setLocalValue((prev) => ({
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
            <PropertyFieldsSection
              draft={controller.localValue.propertyForm}
              editable={editable}
              ariaPrefix="Property"
              showContact={false}
              onFieldChange={(field, next) =>
                controller.setLocalValue((prev) => ({
                  ...prev,
                  propertyForm: { ...prev.propertyForm, [field]: next },
                }))
              }
            />
          </div>
        </div>
      </div>
    </QuickCreateModal>
  )
}
