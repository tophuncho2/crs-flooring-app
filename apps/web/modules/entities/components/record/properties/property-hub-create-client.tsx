"use client"

import {
  ChoiceDialog,
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { EMPTY_ENTITY_FORM } from "@builders/domain"
import { ActionHeader } from "@/engines/common"
import { usePropertyHubCreateSection } from "@/modules/entities/controllers/record/properties/use-property-hub-create-section"
import { PropertyFieldsSection } from "@/modules/properties/components/record/primary/property-fields-section"
import { EntitySelectSection } from "./primary/entity-select-section"

/**
 * The unified property "hub" create form on the record-view engine — replaces
 * the retired hub side panel. One Create button over two groups: a management
 * entity (link or create) and the property fields. Saving creates them
 * atomically via `/api/properties/hub` and lands on the created record.
 */
export type HubCreateEntitySeed = { id: string; label: string | null }

function PropertyHubCreatePanel({
  page,
  backHref,
  initialEntity,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
  initialEntity?: HubCreateEntitySeed | null
}) {
  const controller = usePropertyHubCreateSection({ page, backHref, initialEntity })
  const primary = controller.primarySection
  const editable = !primary.isSaving

  return (
    <>
    <RecordSingleSectionPanel
      title="New Property"
      controller={controller}
      showHeader={false}
      saveLabel="Create"
      savingLabel="Creating..."
    >
      <div className="space-y-4">
        <EntitySelectSection
          value={primary.localValue}
          disabled={!editable}
          onLink={(option) =>
            primary.setLocalValue((prev) =>
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
            primary.setLocalValue((prev) => ({
              ...prev,
              entityLinkId: null,
              entityLinkLabel: null,
              entityForm: { ...prev.entityForm, [field]: next },
            }))
          }
        />

        <ActionHeader title="Property" />
        <div className="p-4">
          <PropertyFieldsSection
            draft={primary.localValue.propertyForm}
            editable={editable}
            ariaPrefix="Property"
            cellSpan={5}
            onFieldChange={(field, next) =>
              primary.setLocalValue((prev) => ({
                ...prev,
                propertyForm: { ...prev.propertyForm, [field]: next },
              }))
            }
          />
        </div>
      </div>
    </RecordSingleSectionPanel>
    {controller.choiceDialogProps ? (
      <ChoiceDialog {...controller.choiceDialogProps} />
    ) : null}
    </>
  )
}

export function PropertyHubCreateClient({
  backHref,
  initialEntity,
}: {
  backHref: string
  initialEntity?: HubCreateEntitySeed | null
}) {
  return (
    <RecordCreateClientScaffold
      title="New Property"
      backHref={backHref}
      dirtyMessage="You have unsaved changes. Leave this form without saving?"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <PropertyHubCreatePanel
          page={page}
          backHref={backHref}
          initialEntity={initialEntity}
        />
      )}
    </RecordCreateClientScaffold>
  )
}
