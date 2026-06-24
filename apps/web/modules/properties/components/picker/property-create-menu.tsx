"use client"

import { RecordCreateMenu } from "@/engines/common"
import { PropertyHubQuickCreateModal } from "@/modules/entities/components/record/properties/property-hub-quick-create-modal"
import type {
  EntityDetail,
  PropertyDetailRecord,
  PropertyOption,
} from "@builders/domain"

/**
 * Map a freshly created property record (+ its entity, if any) into the
 * `PropertyOption` shape the property cells fill from, so a quick-created
 * property seeds the originating cell exactly like a picked one.
 */
function toPropertyOption(
  property: PropertyDetailRecord,
  entity: EntityDetail | null,
): PropertyOption {
  return {
    id: property.id,
    name: property.name,
    address: property.fullAddress,
    streetAddress: property.streetAddress,
    city: property.city,
    state: property.state,
    postalCode: property.zip,
    instructions: property.instructions,
    entityId: entity?.id ?? property.entity?.id ?? null,
    entityName:
      entity?.entity ?? property.entity?.entity ?? null,
  }
}

/**
 * The shared "new property" affordance for a record-view Property cell: a ⋮
 * options menu offering **Quick form** (the inline `PropertyHubQuickCreateModal`,
 * which fills the originating cell with no navigation) and **Proper form**
 * (navigate to the full entity/property create page). Drops straight into a
 * `FormField` `actions` slot beside the cell's `RecordOpenButton`. First
 * hand-rolled in the templates Property cell; promoted here so the work-orders
 * cell (and future property cells) reuse one create flow.
 *
 * Self-contained: it owns the modal open-state and the record→option mapping; the
 * host supplies `returnTo` and an `onCreated` that fills its cell from the
 * returned `PropertyOption` — the same handler its picker already runs for a
 * picked option.
 */
export function PropertyCreateMenu({
  returnTo,
  onCreated,
  initialEntity,
}: {
  /** Record-entry path the proper-form route returns to after create. */
  returnTo: string
  /** Fired with the created property mapped to a `PropertyOption`. */
  onCreated: (option: PropertyOption) => void
  /** Optional entity context to pre-link the quick modal's entity select. */
  initialEntity?: { id: string; label: string | null } | null
}) {
  return (
    <RecordCreateMenu
      heading="New property"
      basePath="/dashboard/entities"
      returnTo={returnTo}
      renderModal={({ open, onClose }) => (
        <PropertyHubQuickCreateModal
          open={open}
          onClose={onClose}
          initialEntity={initialEntity}
          onCreated={(property, entity) => {
            onCreated(toPropertyOption(property, entity))
            onClose()
          }}
        />
      )}
    />
  )
}
