"use client"

import {
  RecordMultiSectionPanel,
  RecordDetailClientScaffold,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import { useEntityCreateSection } from "@/modules/entities/controllers/record/primary/use-entity-create-section"
import { EntityCellsSection } from "./primary/entity-cells-section"

/**
 * The Entity **create** view, reached when a property without an entity
 * is linked from the standalone property record view
 * (`/dashboard/entities/new?property=<id>`). §1 = entity cells (a blank,
 * creatable primary). Saving creates the entity and links the in-tow property
 * atomically (the property rides in `propertyId`), then redirects to the linked
 * property's record view.
 */
function EntityCreatePanel({
  page,
  propertyId,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  propertyId: string
  backHref: string
}) {
  const controller = useEntityCreateSection({ page, propertyId, backHref })
  const primary = controller.primarySection

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 0,
      slot: "primary",
      dirtyLabel: "entity",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Entity"
          showHeader={false}
          saveLabel="Create"
          savingLabel="Creating..."
          error={primary.error}
          noticeMessage={primary.noticeMessage}
          noticeError={primary.noticeError}
          isDirty={primary.isDirty}
          isSaving={primary.isSaving}
          hasConflict={primary.hasConflict}
          onSave={() => void primary.save()}
          onDiscard={primary.discard}
        >
          <EntityCellsSection
            form={primary.localValue}
            editable={!primary.isSaving}
            onFieldChange={(field, value) =>
              primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
            }
            showTypes
            onTypeIdChange={(typeId) =>
              primary.setLocalValue((previous) => ({ ...previous, typeId }))
            }
          />
        </RecordPrimarySectionInstance>
      ),
    },
  ]

  return <RecordMultiSectionPanel page={page} sections={sections} />
}

export function EntityCreateClient({
  propertyId,
  backHref,
}: {
  propertyId: string
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title="New Entity"
      backHref={backHref}
      dirtyMessage="You have unsaved entity changes. Leave without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <EntityCreatePanel page={page} propertyId={propertyId} backHref={backHref} />
      )}
    </RecordDetailClientScaffold>
  )
}
