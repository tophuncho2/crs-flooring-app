"use client"

import { QuickCreateModal } from "@/engines/record-view"
import type { EntityDetail } from "@builders/domain"
import { EntityCellsSection } from "@/modules/entities/components/record/primary/entity-cells-section"
import { useEntityQuickCreate } from "@/modules/entities/controllers/record/use-entity-quick-create"

/**
 * The entity **quick create** form mounted in a modal inside a record
 * view — the modal counterpart to the full `/dashboard/entities/new`
 * page. Reuses the shared `EntityCellsSection` with its full field set
 * (Entity Name + Phone / Email / Address). Creates via `/api/entities`,
 * then hands the created `EntityDetail` back through `onCreated` so the
 * host fills the originating cell — no navigation.
 *
 * Mount it conditionally (only while open) so each open starts from a clean
 * controller snapshot.
 */
export function EntityQuickCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (entity: EntityDetail) => void
}) {
  const controller = useEntityQuickCreate()
  const editable = !controller.isSaving

  async function handleCreate() {
    const result = await controller.save()
    if (result?.entity) {
      onCreated(result.entity)
    }
  }

  return (
    <QuickCreateModal
      open={open}
      title="New Entity"
      onClose={onClose}
      onCreate={() => void handleCreate()}
      canCreate={controller.canCreate}
      isSaving={controller.isSaving}
      error={controller.error}
      widthClassName="max-w-4xl"
    >
      <EntityCellsSection
        form={controller.localValue}
        editable={editable}
        onFieldChange={(field, value) =>
          controller.setLocalValue((prev) => ({ ...prev, [field]: value }))
        }
        showTypes
        onTypeIdsChange={(typeIds) =>
          controller.setLocalValue((prev) => ({ ...prev, typeIds }))
        }
      />
    </QuickCreateModal>
  )
}
