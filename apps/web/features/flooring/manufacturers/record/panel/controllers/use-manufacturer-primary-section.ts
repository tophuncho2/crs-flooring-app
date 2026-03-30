"use client"

import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import { useSingleSectionRecordController, type RecordDetailClientScaffoldContext } from "@/features/shared/engines/record-view"
import { toManufacturerForm, type ManufacturerForm, type ManufacturerRow } from "../../../domain/types"

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
    detailUrl: `/api/flooring/manufacturers/${manufacturer.id}`,
    payloadKey: "manufacturer",
    createLocalValue: toManufacturerForm,
    saveSection: async ({ localValue, record, revisionKey }) => {
      const payload = await requestJson<{ manufacturer: ManufacturerRow }>(
        `/api/flooring/manufacturers/${record.id}/primary/section`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withMutationMeta(localValue, revisionKey)),
        },
      )

      return {
        serverValue: payload.manufacturer,
        noticeMessage: "Manufacturer saved",
      }
    },
    deleteRecord: async (record) => {
      await requestJson<{ ok: true }>(`/api/flooring/manufacturers/${record.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withMutationMeta({}, record.updatedAt)),
      })
    },
    deleteErrorMessage: "Failed to delete manufacturer",
  })
}
