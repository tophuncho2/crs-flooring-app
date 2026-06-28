"use client"

import { RecordCreateMenu } from "@/engines/common"
import { EntityQuickCreateModal } from "@/modules/entities/components/record/entity-quick-create-modal"
import type { EntityDetail, EntityOption } from "@builders/domain"

/**
 * Map a freshly created entity record into the `EntityOption` shape the entity
 * cell fills from, so a quick-created entity seeds the originating cell exactly
 * like a picked one.
 */
function toEntityOption(
  entity: EntityDetail,
): EntityOption {
  return {
    id: entity.id,
    entity: entity.entity,
    streetAddress: entity.streetAddress,
    city: entity.city,
    state: entity.state,
    zip: entity.zip,
    phone: entity.phone,
    email: entity.email,
    fullAddress: entity.fullAddress,
    types: entity.types,
  }
}

/**
 * The shared "new entity" affordance for a record-view entity cell: a ⋮
 * options menu offering **Quick form** (the inline `EntityQuickCreateModal`,
 * which fills the originating cell with no navigation) and **Proper form**
 * (navigate to the full entity create page). Drops straight into a `FormField`
 * `actions` slot beside the cell's `RecordOpenButton`.
 *
 * Self-contained: it owns the modal open-state and the record→option mapping; the
 * host supplies `returnTo` and an `onCreated` that fills its cell from the returned
 * `EntityOption` — the same handler its picker already runs for a picked
 * option.
 */
export function EntityCreateMenu({
  returnTo,
  onCreated,
}: {
  /** Record-entry path the proper-form route returns to after create. */
  returnTo: string
  /** Fired with the created entity mapped to a `EntityOption`. */
  onCreated: (option: EntityOption) => void
}) {
  return (
    <RecordCreateMenu
      heading="New entity"
      basePath="/dashboard/entities"
      returnTo={returnTo}
      renderModal={({ open, onClose }) => (
        <EntityQuickCreateModal
          open={open}
          onClose={onClose}
          onCreated={(entity) => {
            onCreated(toEntityOption(entity))
            onClose()
          }}
        />
      )}
    />
  )
}
