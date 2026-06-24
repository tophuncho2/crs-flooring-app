"use client"

import { QuickCreateModal } from "@/engines/record-view"
import { ActionHeader } from "@/engines/common"
import {
  EMPTY_ENTITY_FORM,
  type EntityDetail,
  type PropertyDetailRecord,
} from "@builders/domain"
import { usePropertyHubQuickCreate } from "@/modules/entities/controllers/record/properties/use-property-hub-quick-create"
import { PropertyFieldsSection } from "@/modules/properties/components/record/primary/property-fields-section"
import { EntitySelectSection } from "./primary/entity-select-section"

const SECTION_CARD_CLASS =
  "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]"

/**
 * The quick-create property form mounted in a modal inside a record view — the
 * full hub create form (`PropertyHubCreatePanel`'s field set) without the page
 * scaffold/navigation. Creates atomically via `/api/properties/hub`, then hands
 * the created records back through `onCreated` so the host can fill the
 * originating cell (no navigation).
 *
 * The select/field sections accept visibility flags (`compact` /
 * `showContact`) to trim cells for leaner quick forms; this property form
 * renders the full set, matching the proper form.
 */
export function PropertyHubQuickCreateModal({
  open,
  onClose,
  onCreated,
  initialEntity,
}: {
  open: boolean
  onClose: () => void
  onCreated: (
    property: PropertyDetailRecord,
    entity: EntityDetail | null,
  ) => void
  initialEntity?: { id: string; label: string | null } | null
}) {
  const controller = usePropertyHubQuickCreate({ initialEntity })
  const editable = !controller.isSaving

  async function handleCreate() {
    const result = await controller.save()
    if (result?.property) {
      onCreated(result.property, result.entity)
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
        <EntitySelectSection
          value={controller.localValue}
          disabled={!editable}
          onLink={(option) =>
            controller.setLocalValue((prev) =>
              option
                ? {
                    ...prev,
                    entityLinkId: option.id,
                    entityLinkLabel: option.entity,
                    entityForm: EMPTY_ENTITY_FORM,
                  }
                : { ...prev, entityLinkId: null, entityLinkLabel: null },
            )
          }
          onEntityFieldChange={(field, next) =>
            controller.setLocalValue((prev) => ({
              ...prev,
              entityLinkId: null,
              entityLinkLabel: null,
              entityForm: { ...prev.entityForm, [field]: next },
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
