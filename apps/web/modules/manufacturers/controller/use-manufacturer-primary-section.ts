"use client"

import { useSingleSectionRecordController, type RecordDetailClientScaffoldContext } from "@/modules/shared/engines/record-view"
import { updateManufacturerRequest, deleteManufacturerRequest } from "@/modules/manufacturers/data/mutations"
import { toManufacturerForm, type ManufacturerForm, type ManufacturerRow } from "@builders/domain"

export function useManufacturerPrimarySection({
  page,
  manufacturer,
}: {
  page: RecordDetailClientScaffoldContext
  manufacturer: ManufacturerRow
}) {
  return useSingleSectionRecordController<ManufacturerRow, ManufacturerForm>({
    page,
    scope: "manufacturer",
    id: manufacturer.id,
    initialRecord: manufacturer,
    detailUrl: `/api/manufacturers/${manufacturer.id}`,
    payloadKey: "manufacturer",
    createLocalValue: toManufacturerForm,
    saveSection: async ({ localValue, record, revisionKey }) => {
      const payload = await updateManufacturerRequest(record.id, localValue, revisionKey)

      return {
        serverValue: payload.manufacturer,
        noticeMessage: "Manufacturer saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteManufacturerRequest(record.id, record.updatedAt)
    },
    deleteErrorMessage: "Failed to delete manufacturer",
  })
}
